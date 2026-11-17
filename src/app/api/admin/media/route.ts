import { NextResponse } from 'next/server';
import { desc, ilike, or } from 'drizzle-orm';
import { db, schema } from '@/db';
import { getSessionUser, can } from '@/lib/auth';
export async function GET(req: Request) {
  const user = await getSessionUser(); if (!user || !can(user, 'content.edit') && !can(user, 'properties.edit')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const q = new URL(req.url).searchParams.get('q')?.slice(0, 80) ?? '';
  const items = await db.select({ id: schema.media.id, url: schema.media.url, alt: schema.media.alt }).from(schema.media)
    .where(q ? or(ilike(schema.media.alt, `%${q}%`), ilike(schema.media.folder, `%${q}%`)) : undefined).orderBy(desc(schema.media.id)).limit(60);
  return NextResponse.json({ items });
}
