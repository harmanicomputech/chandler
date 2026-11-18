import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db';
import { rateLimit } from '@/lib/rate-limit';
import { trackServer } from '@/lib/analytics';

const Body = z.object({ title: z.string().trim().min(1).max(120).default('My Chandler favourites'), items: z.array(z.object({ kind: z.enum(['listing', 'event']), id: z.number().int().positive() })).min(1).max(100) });

/** Create a shareable snapshot of a visitor's saved places. Only published records are accepted. */
export async function POST(req: Request) {
  if (!(await rateLimit('collections', 20, 3600)).ok) return NextResponse.json({ error: 'Too many shared lists. Try again later.' }, { status: 429 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'Nothing to share yet.' }, { status: 422 });
  const lIds = p.data.items.filter((i) => i.kind === 'listing').map((i) => i.id); const eIds = p.data.items.filter((i) => i.kind === 'event').map((i) => i.id);
  const [ls, es] = await Promise.all([
    lIds.length ? db.select({ id: schema.listings.id }).from(schema.listings).where(and(inArray(schema.listings.id, lIds), eq(schema.listings.status, 'published'))) : [],
    eIds.length ? db.select({ id: schema.events.id }).from(schema.events).where(and(inArray(schema.events.id, eIds), eq(schema.events.status, 'published'))) : [],
  ]);
  const ok = new Set([...ls.map((r) => `listing:${r.id}`), ...es.map((r) => `event:${r.id}`)]);
  const items = p.data.items.filter((i) => ok.has(`${i.kind}:${i.id}`));
  if (!items.length) return NextResponse.json({ error: 'These places are no longer listed.' }, { status: 422 });
  const shareToken = crypto.randomBytes(9).toString('base64url');
  await db.insert(schema.collections).values({ site: 'visit', shareToken, title: p.data.title, items });
  await trackServer('visit', 'save_item', { shared: items.length });
  return NextResponse.json({ shareToken, count: items.length });
}
