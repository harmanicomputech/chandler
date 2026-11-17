import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { rateLimit } from '@/lib/rate-limit';
import { subscribeNewsletter } from '@/lib/integrations';
import { trackServer } from '@/lib/analytics';

const Body = z.object({ email: z.string().trim().toLowerCase().email().max(255), consent: z.literal(true), site: z.enum(['visit', 'edo']).default('visit'), firstName: z.string().max(80).optional(), interests: z.array(z.string().max(40)).max(10).default([]), hp: z.any().optional() });

export async function POST(req: Request) {
  if (!(await rateLimit('newsletter', 5, 600)).ok) return NextResponse.json({ error: 'Too many attempts — please try again later.' }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Please enter a valid email and tick the consent box.' }, { status: 422 });
  const d = parsed.data;
  if (d.hp) return NextResponse.json({ message: "You're subscribed!" });
  await db.insert(schema.newsletterSubscribers).values({ site: d.site, email: d.email, firstName: d.firstName, interests: d.interests })
    .onConflictDoUpdate({ target: [schema.newsletterSubscribers.site, schema.newsletterSubscribers.email], set: { unsubscribedAt: null, consentAt: sql`now()` } });
  const res = await subscribeNewsletter({ email: d.email, firstName: d.firstName, site: d.site, interests: d.interests });
  await db.update(schema.newsletterSubscribers).set({ syncStatus: res.status }).where(sql`site = ${d.site} and email = ${d.email}`);
  await trackServer(d.site, 'newsletter_subscribe');
  return NextResponse.json({ message: "You're subscribed — welcome to Chandler!" });
}
