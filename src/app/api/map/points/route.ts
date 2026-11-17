import { NextResponse } from 'next/server';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { db, schema } from '@/db';

export const revalidate = 600;

/** Lightweight GeoJSON-ish feed of published, geocoded listings + upcoming events for the maps. */
export async function GET() {
  const { listings, media, events } = schema;
  const [ls, ev] = await Promise.all([
    db.select({ id: listings.id, slug: listings.slug, name: listings.name, type: listings.type, sub: listings.subcategory, lat: listings.latitude, lng: listings.longitude, address: listings.address, image: media.url })
      .from(listings).leftJoin(media, eq(listings.primaryMediaId, media.id))
      .where(and(eq(listings.status, 'published'), isNotNull(listings.latitude), sql`${listings.latitude} between 32.9 and 33.8`, sql`${listings.longitude} between -112.4 and -111.4`)),
    db.select({ id: events.id, slug: events.slug, name: events.title, lat: events.latitude, lng: events.longitude, address: events.locationName, start: events.startDate, image: media.url })
      .from(events).leftJoin(media, eq(events.primaryMediaId, media.id))
      .where(and(eq(events.status, 'published'), eq(events.site, 'visit'), isNotNull(events.latitude), sql`coalesce(${events.endDate}, ${events.startDate}, current_date) >= current_date`)),
  ]);
  const points = [
    ...ls.map((l) => ({ kind: 'listing' as const, id: l.id, name: l.name, cat: l.type, sub: l.sub, lat: l.lat!, lng: l.lng!, address: l.address, image: l.image, href: `/listing/${l.slug}/${l.id}/` })),
    ...ev.map((e) => ({ kind: 'event' as const, id: e.id, name: e.name, cat: 'event', sub: e.start, lat: e.lat!, lng: e.lng!, address: e.address, image: e.image, href: `/event/${e.slug}/${e.id}/` })),
  ];
  return NextResponse.json({ points, generatedAt: new Date().toISOString() }, { headers: { 'cache-control': 'public, s-maxage=600, stale-while-revalidate=3600' } });
}
