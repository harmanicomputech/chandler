import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { queryListings, getEvent } from '@/lib/content';
import { PageHero } from '@/components/visit/PageHero';
import { Img } from '@/components/shared/Img';
import { PrintButton } from '@/components/visit/PrintButton';

export const metadata: Metadata = { title: 'Shared itinerary', robots: { index: false } };

/** Read-only shared itinerary (server-rendered, printable). Items resolve to live published records. */
export default async function Shared({ params }: { params: Promise<{ token: string }> }) {
  const [it] = await db.select().from(schema.itineraries).where(eq(schema.itineraries.shareToken, (await params).token)).limit(1);
  if (!it) notFound();
  const ids = it.days.flatMap((d) => d.items.filter((x) => x.kind === 'listing').map((x) => x.id));
  const ls = ids.length ? (await queryListings({ ids, limit: 200 })).rows : [];
  const evs = await Promise.all(it.days.flatMap((d) => d.items.filter((x) => x.kind === 'event').map((x) => getEvent(x.id))));
  const resolve = (x: { kind: string; id: number }) => x.kind === 'listing' ? (() => { const l = ls.find((y) => y.id === x.id); return l && { name: l.name, href: `/listing/${l.slug}/${l.id}/`, image: l.image, sub: l.subcategory, address: l.address }; })()
    : (() => { const e = evs.find((y) => y?.id === x.id); return e && { name: e.title, href: `/event/${e.slug}/${e.id}/`, image: e.image?.url ?? null, sub: e.startDate, address: e.locationName }; })();
  return (
    <>
      <PageHero title={it.title} eyebrow="Shared itinerary" intro={it.startDate ? `${it.startDate}${it.endDate ? ` to ${it.endDate}` : ''}` : null} crumbs={[{ label: 'Home', href: '/' }, { label: 'Trip planner', href: '/trip-planner/' }, { label: it.title, href: '#' }]} />
      <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
        <div className="mb-8 flex gap-3 print:hidden"><PrintButton /><Link href="/trip-planner/" className="rounded-full px-5 py-3 text-sm font-bold ring-1 ring-line">Plan your own trip</Link></div>
        <ol className="space-y-8">{it.days.map((d) => (
          <li key={d.day} className="break-inside-avoid"><h2 className="font-display text-4xl text-navy">Day {d.day}</h2>
            <ul className="mt-4 space-y-3">{d.items.map((x, i) => { const r = resolve(x); if (!r) return <li key={i} className="text-sm text-ink-soft">This place is no longer listed.</li>;
              return <li key={i} className="flex items-center gap-4 rounded-2xl bg-mist p-3"><div className="relative size-16 shrink-0 overflow-hidden rounded-xl print:hidden"><Img src={r.image} alt="" fill sizes="64px" className="object-cover" /></div>
                <div><Link href={r.href} className="font-bold text-navy hover:underline">{r.name}</Link><p className="text-sm text-ink-soft">{[r.sub, r.address].filter(Boolean).join(' · ')}</p>{x.note && <p className="mt-1 text-sm italic text-navy">“{x.note}”</p>}</div></li>; })}</ul>
          </li>
        ))}</ol>
      </div>
    </>
  );
}
