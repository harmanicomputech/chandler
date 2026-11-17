import { NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { FORMS, schemaFor } from '@/lib/forms';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { syncSubmissionToCrm, notifyStaff } from '@/lib/integrations';
import { trackServer } from '@/lib/analytics';

/** Single endpoint for every public form. Validates against the form spec, stores, then hands off. */
export async function POST(req: Request, { params }: { params: Promise<{ form: string }> }) {
  const { form } = await params;
  const spec = FORMS[form];
  if (!spec) return NextResponse.json({ ok: false, error: 'Unknown form' }, { status: 404 });

  const origin = req.headers.get('origin'); const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) return NextResponse.json({ ok: false, error: 'Bad origin' }, { status: 403 });

  const rl = await rateLimit(`form:${form}`, 8, 600);
  if (!rl.ok) return NextResponse.json({ ok: false, error: 'Too many submissions. Please wait a few minutes and try again.' }, { status: 429 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 }); }
  // Honeypot + minimum fill time (bots submit instantly)
  if (body.company_website || (typeof body._t === 'number' && Date.now() - body._t < 2500)) return NextResponse.json({ ok: true, message: spec.success });

  const parsed = schemaFor(spec).safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] = i.message;
    return NextResponse.json({ ok: false, error: 'Please correct the highlighted fields.', errors }, { status: 422 });
  }
  const d = parsed.data as Record<string, unknown>;
  const entityId = typeof body.entityId === 'number' ? body.entityId : null;
  const [row] = await db.insert(schema.submissions).values({
    site: spec.site, type: spec.type,
    name: [d.firstName, d.lastName].filter(Boolean).join(' ') || null, email: (d.email as string) ?? null,
    organisation: (d.company as string) ?? (d.organisation as string) ?? (d.businessName as string) ?? null,
    subject: (d.eventTitle as string) ?? (d.meetingName as string) ?? (d.businessName as string) ?? (d.topic as string) ?? (d.projectType as string) ?? (d.enquiryType as string) ?? spec.title,
    payload: d, entity: entityId ? (spec.type === 'property_enquiry' ? 'property' : 'listing') : null, entityId,
    ip: await clientIp(),
  }).returning({ id: schema.submissions.id });

  // Hand-offs run after the response is prepared; failures are recorded, never shown to the visitor.
  await Promise.allSettled([
    syncSubmissionToCrm(row.id),
    notifyStaff(`[${spec.site === 'visit' ? 'Visit Chandler' : 'Chandler EDO'}] New ${spec.title}`, `Submission #${row.id} — review in the admin: /admin/submissions/${row.id}/`),
    trackServer(spec.site, `form_submit_${spec.type}`, { form }),
  ]);
  return NextResponse.json({ ok: true, id: row.id, message: spec.success });
}
