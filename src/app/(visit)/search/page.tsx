import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { siteSearch } from '@/lib/content';
import { PageHero } from '@/components/visit/PageHero';
import { ListingCardView, EventCardView, StoryCard } from '@/components/visit/Cards';

export const metadata: Metadata = { title: 'Search', robots: { index: false } };
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? '').trim().slice(0, 80);
  const r = q.length >= 2 ? await siteSearch(q) : null;
  const total = r ? r.listings.length + r.events.length + r.articles.length + r.pages.length : 0;
  return (
    <>
      <PageHero title={q ? `Results for “${q}”` : 'Search Visit Chandler'} crumbs={[{ label: 'Home', href: '/' }, { label: 'Search', href: '/search/' }]}>
        <form role="search" action="/search/" className="mt-8 flex max-w-2xl items-center gap-2 rounded-full bg-white p-2 pl-5 ring-1 ring-line">
          <Search className="size-5 text-blue-500" aria-hidden /><label htmlFor="sq" className="sr-only">Search</label>
          <input id="sq" name="q" defaultValue={q} autoFocus placeholder="Try “brunch”, “balloon”, “Ostrich Festival”" className="min-w-0 flex-1 bg-transparent py-3 outline-none" /><button className="rounded-full bg-blue-500 px-6 py-3 font-bold text-white">Search</button>
        </form>
      </PageHero>
      <div className="mx-auto max-w-[1440px] space-y-16 px-5 py-14 sm:px-8">
        {r && <p aria-live="polite" className="text-ink-soft">{total} results</p>}
        {r?.pages.length ? <section><h2 className="font-display text-4xl text-navy">Pages</h2><ul className="mt-5 grid gap-3 sm:grid-cols-2">{r.pages.map((p) => <li key={p.path}><Link href={p.path} className="block rounded-2xl bg-mist p-5 hover:bg-blue-50"><p className="font-bold text-navy">{p.title}</p>{p.summary && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{p.summary}</p>}</Link></li>)}</ul></section> : null}
        {r?.listings.length ? <section><h2 className="font-display text-4xl text-navy">Places</h2><div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{r.listings.map((l) => <ListingCardView key={l.id} l={l} />)}</div></section> : null}
        {r?.events.length ? <section><h2 className="font-display text-4xl text-navy">Events</h2><div className="mt-6 grid gap-6 md:grid-cols-3">{r.events.map((e) => <EventCardView key={e.id} e={e} />)}</div></section> : null}
        {r?.articles.length ? <section><h2 className="font-display text-4xl text-navy">Stories</h2><div className="mt-6 grid gap-8 md:grid-cols-4">{r.articles.map((a) => <StoryCard key={a.id} a={a} />)}</div></section> : null}
        {r && total === 0 && <p className="rounded-2xl bg-mist p-10 text-center text-ink-soft">No results. Try a broader term, or <Link className="underline" href="/concierge/">ask the concierge</Link>.</p>}
      </div>
    </>
  );
}
