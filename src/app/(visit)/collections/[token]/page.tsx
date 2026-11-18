import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { queryListings, getEvent } from '@/lib/content';
import { PageHero } from '@/components/visit/PageHero';
import { ListingCardView, EventCardView, listingHref, eventHref } from '@/components/visit/Cards';
import { CopyCollection } from '@/components/visit/CopyCollection';

export const metadata: Metadata = { title: 'Shared list', robots: { index: false } };
/** Read-only shared list. Items resolve to currently published records (unpublished ones are noted, not shown). */
export default async function SharedCollection({ params }: { params: Promise<{ token: string }> }) {
  const [c] = await db.select().from(schema.collections).where(eq(schema.collections.shareToken, (await params).token)).limit(1);
  if (!c) notFound();
  const lIds = c.items.filter((i) => i.kind === 'listing').map((i) => i.id);
  const listings = lIds.length ? (await queryListings({ ids: lIds, limit: 100 })).rows : [];
  const events = (await Promise.all(c.items.filter((i) => i.kind === 'event').map((i) => getEvent(i.id)))).filter((e): e is NonNullable<typeof e> => !!e);
  const missing = c.items.length - listings.length - events.length;
  const copyItems = [...listings.map((l) => ({ kind: 'listing' as const, id: l.id, name: l.name, href: listingHref(l), image: l.image, lat: l.latitude, lng: l.longitude, category: l.subcategory })),
    ...events.map((e) => ({ kind: 'event' as const, id: e.id, name: e.title, href: eventHref(e), image: e.image?.url ?? null, lat: e.latitude, lng: e.longitude, category: e.categories[0] ?? null }))];
  return (
    <>
      <PageHero title={c.title} eyebrow="Shared list" intro={`${copyItems.length} ${copyItems.length === 1 ? 'place' : 'places'} in Chandler, Arizona`} crumbs={[{ label: 'Home', href: '/' }, { label: 'Shared list', href: '#' }]}>
        <div className="mt-8 flex flex-wrap gap-3"><CopyCollection items={copyItems} /><Link href="/trip-planner/" className="rounded-full bg-white px-6 py-3 font-bold text-navy ring-1 ring-line">Open trip planner</Link></div>
      </PageHero>
      <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8">
        {listings.length > 0 && <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">{listings.map((l) => <ListingCardView key={l.id} l={l} />)}</div>}
        {events.length > 0 && <><h2 className="mt-16 font-display text-4xl text-navy">Events</h2><div className="mt-6 grid gap-6 md:grid-cols-3">{events.map((e) => <EventCardView key={e.id} e={{ id: e.id, slug: e.slug, title: e.title, startDate: e.startDate, endDate: e.endDate, timesText: e.timesText, recurrenceText: e.recurrenceText, locationName: e.locationName, categories: e.categories, image: e.image?.url ?? null, imageAlt: e.image?.alt ?? null, latitude: e.latitude, longitude: e.longitude, admission: e.admission }} />)}</div></>}
        {missing > 0 && <p className="mt-10 text-sm text-ink-soft">{missing} {missing === 1 ? 'place in this list is' : 'places in this list are'} no longer listed on Visit Chandler.</p>}
      </div>
    </>
  );
}
