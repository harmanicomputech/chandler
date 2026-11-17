import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { Itin, hashToken } from '@/lib/itinerary';
import { db, schema } from '@/db';
import { rateLimit } from '@/lib/rate-limit';
import { trackServer } from '@/lib/analytics';


/** Create a shareable itinerary. Returns a public share token and a private edit token (kept in the visitor's browser). */
export async function POST(req: Request) {
  if (!(await rateLimit('itin', 20, 3600)).ok) return NextResponse.json({ error: 'Too many itineraries created. Try later.' }, { status: 429 });
  const p = Itin.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'Invalid itinerary' }, { status: 422 });
  const shareToken = crypto.randomBytes(9).toString('base64url');
  const editToken = crypto.randomBytes(24).toString('base64url');
  await db.insert(schema.itineraries).values({ ...p.data, startDate: p.data.startDate ?? null, endDate: p.data.endDate ?? null, shareToken, editToken: hashToken(editToken) });
  await trackServer('visit', 'itinerary_create', { days: p.data.days.length });
  return NextResponse.json({ shareToken, editToken });
}
