import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db, schema } from '@/db';
import { Itin, hashToken } from '@/lib/itinerary';

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const [row] = await db.select().from(schema.itineraries).where(eq(schema.itineraries.shareToken, (await params).token)).limit(1);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { editToken: _e, ...pub } = row; void _e;
  return NextResponse.json(pub);
}

/** Update requires the private edit token (constant-time compare against stored hash). */
export async function PUT(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const body = await req.json().catch(() => null);
  const p = Itin.safeParse(body?.itinerary);
  if (!p.success || typeof body?.editToken !== 'string') return NextResponse.json({ error: 'Invalid request' }, { status: 422 });
  const [row] = await db.select().from(schema.itineraries).where(eq(schema.itineraries.shareToken, (await params).token)).limit(1);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const a = Buffer.from(hashToken(body.editToken)); const b = Buffer.from(row.editToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  await db.update(schema.itineraries).set({ ...p.data, startDate: p.data.startDate ?? null, endDate: p.data.endDate ?? null, updatedAt: new Date() }).where(eq(schema.itineraries.id, row.id));
  return NextResponse.json({ ok: true });
}
