import { NextResponse } from 'next/server';
import { queryListings, queryEvents } from '@/lib/content';
import { rateLimit } from '@/lib/rate-limit';

/** Typeahead for the trip planner / concierge. Returns published records only. */
export async function GET(req: Request) {
  if (!(await rateLimit('search', 120, 60)).ok) return NextResponse.json({ results: [] }, { status: 429 });
  const u = new URL(req.url); const q = (u.searchParams.get('q') ?? '').slice(0, 80);
  const type = u.searchParams.get('type') ?? undefined;
  const idsParam = u.searchParams.get('ids');
  if (idsParam) {
    const ids = idsParam.split(',').map(Number).filter(Boolean).slice(0, 100);
    const r = await queryListings({ ids, limit: 100 });
    return NextResponse.json({ results: r.rows.map((l) => ({ kind: 'listing', id: l.id, name: l.name, sub: l.subcategory, type: l.type, href: `/listing/${l.slug}/${l.id}/`, image: l.image, lat: l.latitude, lng: l.longitude, address: l.address })) });
  }
  if (q.length < 2 && !type) return NextResponse.json({ results: [] });
  const [ls, ev] = await Promise.all([queryListings({ q: q || undefined, type: type || undefined, limit: 12 }), type ? Promise.resolve({ rows: [] }) : queryEvents({ q, limit: 6 })]);
  return NextResponse.json({ results: [
    ...ls.rows.map((l) => ({ kind: 'listing', id: l.id, name: l.name, sub: l.subcategory, type: l.type, href: `/listing/${l.slug}/${l.id}/`, image: l.image, lat: l.latitude, lng: l.longitude, address: l.address })),
    ...ev.rows.map((e) => ({ kind: 'event', id: e.id, name: e.title, sub: e.startDate, type: 'event', href: `/event/${e.slug}/${e.id}/`, image: e.image, lat: e.latitude, lng: e.longitude, address: e.locationName })),
  ] });
}
