import Link from 'next/link';
import { Search, SlidersHorizontal } from 'lucide-react';
import { queryListings, type ListingQuery } from '@/lib/content';
import { ListingCardView } from './Cards';
import { DirectoryMap } from './DirectoryMap';

const PER_PAGE = 24;

/**
 * Server-rendered, filterable directory. Filters are a plain GET form (works without JS, shareable URLs,
 * crawlable). Membership comes from the CMS block (exact listing IDs captured from the legacy widget),
 * falling back to sub-category / amenity rules.
 */
export async function Directory({ path, block, sp }: { path: string; block: { recids?: number[]; subcats?: string[]; presetAmenities?: string[] }; sp: Record<string, string | undefined> }) {
  const page = Math.max(1, Number(sp.page) || 1);
  const base: ListingQuery = block.recids?.length ? { ids: block.recids } : { subcategory: block.subcats?.length ? block.subcats : undefined, amenity: block.presetAmenities?.length ? block.presetAmenities : undefined };
  const all = await queryListings({ ...base, limit: 1000 });
  const subcats = [...new Set(all.rows.map((r) => r.subcategory).filter(Boolean))] as string[];
  const regions = [...new Set(all.rows.map((r) => r.region).filter(Boolean))].sort() as string[];
  const filtered = await queryListings({ ...base, q: sp.q || undefined, subcategory: sp.sub || base.subcategory, region: sp.region || undefined, limit: PER_PAGE, offset: (page - 1) * PER_PAGE, sort: sp.sort === 'recent' ? 'recent' : 'name' });
  const pages = Math.ceil(filtered.total / PER_PAGE);
  const qs = (o: Record<string, string | number | undefined>) => { const u = new URLSearchParams(); Object.entries({ ...sp, ...o }).forEach(([k, v]) => v !== undefined && v !== '' && u.set(k, String(v))); const s = u.toString(); return s ? `?${s}` : ''; };
  const view = sp.view === 'map' ? 'map' : 'grid';
  return (
    <section id="directory" aria-labelledby="dir-title" className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8">
      <h2 id="dir-title" className="sr-only">Directory</h2>
      <form method="get" action={`${path}#directory`} className="sticky top-[76px] z-30 -mx-5 flex flex-wrap items-center gap-3 border-b border-line bg-white/90 px-5 py-4 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:px-4" role="search">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full bg-mist px-4">
          <Search className="size-4 text-blue-500" aria-hidden /><label htmlFor="dq" className="sr-only">Keyword</label>
          <input id="dq" name="q" defaultValue={sp.q} placeholder="Search by name or keyword" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" />
        </div>
        {subcats.length > 1 && (<><label htmlFor="dsub" className="sr-only">Category</label>
          <select id="dsub" name="sub" defaultValue={sp.sub ?? ''} className="rounded-full bg-mist px-4 py-3 text-sm font-semibold outline-none"><option value="">All categories</option>{subcats.map((c) => <option key={c}>{c}</option>)}</select></>)}
        {regions.length > 1 && (<><label htmlFor="dreg" className="sr-only">Area</label>
          <select id="dreg" name="region" defaultValue={sp.region ?? ''} className="rounded-full bg-mist px-4 py-3 text-sm font-semibold outline-none"><option value="">All areas</option>{regions.map((c) => <option key={c}>{c}</option>)}</select></>)}
        <label htmlFor="dsort" className="sr-only">Sort</label>
        <select id="dsort" name="sort" defaultValue={sp.sort ?? 'name'} className="rounded-full bg-mist px-4 py-3 text-sm font-semibold outline-none"><option value="name">A–Z</option><option value="recent">Recently updated</option></select>
        <input type="hidden" name="view" value={view} />
        <button className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-5 py-3 text-sm font-bold text-white hover:bg-navy"><SlidersHorizontal className="size-4" aria-hidden />Apply</button>
        <div className="ml-auto flex overflow-hidden rounded-full ring-1 ring-line text-sm font-semibold">
          <Link href={`${path}${qs({ view: 'grid', page: undefined })}#directory`} aria-current={view === 'grid'} className={`px-4 py-2.5 ${view === 'grid' ? 'bg-navy text-white' : ''}`}>Grid</Link>
          <Link href={`${path}${qs({ view: 'map', page: undefined })}#directory`} aria-current={view === 'map'} className={`px-4 py-2.5 ${view === 'map' ? 'bg-navy text-white' : ''}`}>Map</Link>
        </div>
      </form>
      <p className="mt-8 text-sm text-ink-soft" aria-live="polite"><strong className="text-navy">{filtered.total}</strong> {filtered.total === 1 ? 'place' : 'places'}{sp.q && <> matching “{sp.q}”</>}{(sp.q || sp.sub || sp.region) && <> · <Link href={`${path}#directory`} className="font-semibold text-blue-500 underline">Clear filters</Link></>}</p>
      {view === 'map' ? (
        <div className="mt-6 overflow-hidden rounded-[var(--radius-card)] ring-1 ring-line"><DirectoryMap rows={(await queryListings({ ...base, q: sp.q || undefined, subcategory: sp.sub || base.subcategory, region: sp.region || undefined, limit: 1000 })).rows} /></div>
      ) : filtered.rows.length ? (
        <div className="mt-6 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.rows.map((l, i) => <div key={l.id} data-reveal style={{ '--reveal-delay': `${(i % 4) * 60}ms` } as React.CSSProperties}><ListingCardView l={l} priority={i < 4} /></div>)}
        </div>
      ) : <p className="mt-10 rounded-2xl bg-mist p-10 text-center text-ink-soft">No places match those filters. <Link href={`${path}#directory`} className="font-semibold text-blue-500 underline">Reset</Link></p>}
      {view === 'grid' && pages > 1 && (
        <nav aria-label="Pagination" className="mt-14 flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={`${path}${qs({ page: n })}#directory`} aria-current={n === page ? 'page' : undefined} className={`grid size-11 place-items-center rounded-full text-sm font-bold ${n === page ? 'bg-navy text-white' : 'bg-mist text-navy hover:bg-blue-50'}`}>{n}</Link>
          ))}
        </nav>
      )}
    </section>
  );
}
