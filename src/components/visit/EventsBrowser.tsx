import Link from 'next/link';
import { CalendarDays, Plus } from 'lucide-react';
import { queryEvents, eventCategories } from '@/lib/content';
import { EventCardView } from './Cards';
import { EventsCalendar } from './EventsCalendar';

const PER = 18;
const iso = (d: Date) => d.toISOString().slice(0, 10);
function weekendRange(now = new Date()) {
  const d = new Date(now.toLocaleString('en-US', { timeZone: 'America/Phoenix' }));
  const day = d.getDay(); const fri = new Date(d); fri.setDate(d.getDate() + ((5 - day + 7) % 7 || (day === 5 ? 0 : 7)));
  if (day === 6 || day === 0) fri.setDate(d.getDate() - (day === 6 ? 1 : 2));
  const sun = new Date(fri); sun.setDate(fri.getDate() + 2); return { from: iso(fri), to: iso(sun) };
}

/** Events calendar: filter by date range, category & keyword; list or month view; all server-rendered. */
export async function EventsBrowser({ path, sp, weekend, intro }: { path: string; sp: Record<string, string | undefined>; weekend?: boolean; intro?: string }) {
  const page = Math.max(1, Number(sp.page) || 1);
  const range = weekend ? weekendRange() : { from: sp.from || undefined, to: sp.to || undefined };
  const [res, cats, monthAll] = await Promise.all([
    queryEvents({ ...range, category: sp.cat || undefined, q: sp.q || undefined, limit: PER, offset: (page - 1) * PER }),
    eventCategories(),
    sp.view === 'month' ? queryEvents({ includePast: true, limit: 500 }) : Promise.resolve(null),
  ]);
  const pages = Math.ceil(res.total / PER);
  const qs = (o: Record<string, string | number | undefined>) => { const u = new URLSearchParams(); Object.entries({ ...sp, ...o }).forEach(([k, v]) => v !== undefined && v !== '' && u.set(k, String(v))); return u.toString() ? `?${u}` : ''; };
  return (
    <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8">
      {intro && <div className="prose-vc mb-10 max-w-3xl" dangerouslySetInnerHTML={{ __html: intro }} />}
      <div className="grid gap-10 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <form method="get" action={path} className="space-y-6 lg:sticky lg:top-28" role="search" aria-label="Filter events">
            <div><label htmlFor="eq" className="text-sm font-bold text-navy">Keyword</label><input id="eq" name="q" defaultValue={sp.q} placeholder="e.g. jazz, market" className="mt-2 w-full rounded-xl border border-line px-4 py-3 text-sm" /></div>
            {!weekend && (<div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="ef" className="text-sm font-bold text-navy">From</label><input id="ef" type="date" name="from" defaultValue={sp.from} className="mt-2 w-full rounded-xl border border-line px-3 py-3 text-sm" /></div>
              <div><label htmlFor="et" className="text-sm font-bold text-navy">To</label><input id="et" type="date" name="to" defaultValue={sp.to} className="mt-2 w-full rounded-xl border border-line px-3 py-3 text-sm" /></div>
            </div>)}
            <fieldset><legend className="text-sm font-bold text-navy">Category</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="cursor-pointer"><input type="radio" name="cat" value="" defaultChecked={!sp.cat} className="peer sr-only" /><span className="inline-block rounded-full bg-mist px-3 py-1.5 text-xs font-semibold peer-checked:bg-navy peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-teal-400">All</span></label>
                {cats.map((c) => <label key={c.c} className="cursor-pointer"><input type="radio" name="cat" value={c.c} defaultChecked={sp.cat === c.c} className="peer sr-only" /><span className="inline-block rounded-full bg-mist px-3 py-1.5 text-xs font-semibold peer-checked:bg-navy peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-teal-400">{c.c} <span className="opacity-60">{c.n}</span></span></label>)}
              </div>
            </fieldset>
            <button className="w-full rounded-full bg-blue-500 py-3 text-sm font-bold text-white hover:bg-navy">Show events</button>
            <Link href="/events/submit-your-event/" className="flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-navy ring-1 ring-line hover:bg-mist"><Plus className="size-4" aria-hidden />Submit your event</Link>
          </form>
        </aside>
        <div className="lg:col-span-9">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-ink-soft" aria-live="polite"><strong className="text-navy">{res.total}</strong> events{weekend && <> this weekend ({range.from} – {range.to})</>}</p>
            <div className="flex overflow-hidden rounded-full text-sm font-semibold ring-1 ring-line">
              <Link href={`${path}${qs({ view: undefined, page: undefined })}`} aria-current={sp.view !== 'month'} className={`px-4 py-2 ${sp.view !== 'month' ? 'bg-navy text-white' : ''}`}>List</Link>
              <Link href={`${path}${qs({ view: 'month', page: undefined })}`} aria-current={sp.view === 'month'} className={`inline-flex items-center gap-1.5 px-4 py-2 ${sp.view === 'month' ? 'bg-navy text-white' : ''}`}><CalendarDays className="size-4" aria-hidden />Month</Link>
            </div>
          </div>
          {sp.view === 'month' && monthAll ? <EventsCalendar events={monthAll.rows.map((e) => ({ id: e.id, slug: e.slug, title: e.title, start: e.startDate, end: e.endDate }))} />
            : res.rows.length ? <div className="mt-4">{res.rows.map((e) => <EventCardView key={e.id} e={e} layout="row" />)}</div>
            : <p className="mt-8 rounded-2xl bg-mist p-10 text-center text-ink-soft">No events match. Try a wider date range.</p>}
          {sp.view !== 'month' && pages > 1 && <nav aria-label="Pagination" className="mt-10 flex flex-wrap gap-2">{Array.from({ length: pages }, (_, i) => i + 1).map((n) => <Link key={n} href={`${path}${qs({ page: n })}`} aria-current={n === page ? 'page' : undefined} className={`grid size-11 place-items-center rounded-full text-sm font-bold ${n === page ? 'bg-navy text-white' : 'bg-mist'}`}>{n}</Link>)}</nav>}
        </div>
      </div>
    </section>
  );
}
