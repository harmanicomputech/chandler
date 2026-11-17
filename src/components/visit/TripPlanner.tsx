'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, ArrowDown, Trash2, Plus, Share2, Printer, Search, Loader2, CalendarDays, Check, MapPin, Sparkles } from 'lucide-react';
import { readSaved, writeSaved, type SavedItem } from './SaveButton';
import { MapView } from '@/components/shared/MapView';
import { VISIT_MAP_CATEGORIES } from './mapCategories';
import { track } from '@/components/shared/track';

type Item = { kind: 'listing' | 'event'; id: number; name: string; href: string; image?: string | null; lat?: number | null; lng?: number | null; category?: string | null; note?: string };
type Plan = { title: string; startDate: string; endDate: string; interests: string[]; days: Item[][] };
const INTERESTS = [
  { key: 'outdoors', label: 'Outdoors & hiking', type: 'park' }, { key: 'dining', label: 'Food & drink', type: 'restaurant' }, { key: 'family', label: 'Family fun', type: 'attraction' },
  { key: 'arts', label: 'Arts & culture', type: 'arts' }, { key: 'shopping', label: 'Shopping', type: 'shopping' }, { key: 'golf', label: 'Golf', type: 'golf' }, { key: 'nightlife', label: 'Nightlife', type: 'nightlife' },
];
const KEY = 'vc:plan'; const TOK = 'vc:plan-tokens';
const blank = (): Plan => ({ title: 'My Chandler trip', startDate: '', endDate: '', interests: [], days: [[]] });
const nights = (a: string, b: string) => (a && b ? Math.max(1, Math.round((+new Date(b) - +new Date(a)) / 864e5) + 1) : 0);

/**
 * Trip planner. No account needed: the working plan lives in the browser; "Share" saves a copy server-side
 * and returns a link (with a private edit token kept locally so the owner can keep updating it).
 */
export function TripPlanner() {
  const [plan, setPlan] = useState<Plan>(blank);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [q, setQ] = useState(''); const [results, setResults] = useState<Item[]>([]); const [searching, setSearching] = useState(false);
  const [suggest, setSuggest] = useState<Item[]>([]);
  const [share, setShare] = useState<{ url: string; state: 'idle' | 'saving' | 'done' | 'error' }>({ url: '', state: 'idle' });
  const [activeDay, setActiveDay] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); if (p) setPlan(p); } catch {} setSaved(readSaved()); setLoaded(true);
    const s = () => setSaved(readSaved()); window.addEventListener('vc:saved-changed', s); return () => window.removeEventListener('vc:saved-changed', s); }, []);
  useEffect(() => { if (loaded) try { localStorage.setItem(KEY, JSON.stringify(plan)); } catch {} }, [plan, loaded]);
  useEffect(() => { // keep number of days in sync with dates
    const n = nights(plan.startDate, plan.endDate); if (!n || n > 14 || n === plan.days.length) return;
    setPlan((p) => ({ ...p, days: Array.from({ length: n }, (_, i) => p.days[i] ?? []).map((d, i, arr) => (i === n - 1 ? [...d, ...p.days.slice(n).flat()] : d)) }));
  }, [plan.startDate, plan.endDate, plan.days.length]);
  useEffect(() => {
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => { setSearching(true); const r = await fetch(`/api/search/?q=${encodeURIComponent(q)}`).then((x) => x.json()).catch(() => ({ results: [] })); setResults(r.results); setSearching(false); }, 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => { // interest-based suggestions from real directory listings
    const types = INTERESTS.filter((i) => plan.interests.includes(i.key)).map((i) => i.type);
    if (!types.length) { setSuggest([]); return; }
    Promise.all(types.map((t) => fetch(`/api/search/?type=${t}`).then((r) => r.json()).then((j) => j.results.slice(0, 3)).catch(() => []))).then((a) => setSuggest(a.flat()));
  }, [plan.interests]);

  const inPlan = (it: { kind: string; id: number }) => plan.days.some((d) => d.some((x) => x.kind === it.kind && x.id === it.id));
  const add = (it: Item, day = activeDay) => { if (inPlan(it)) return; setPlan((p) => ({ ...p, days: p.days.map((d, i) => (i === day ? [...d, it] : d)) })); };
  const move = (day: number, idx: number, dir: -1 | 1) => setPlan((p) => {
    const days = p.days.map((d) => [...d]); const item = days[day][idx];
    const ni = idx + dir;
    if (ni >= 0 && ni < days[day].length) { days[day].splice(idx, 1); days[day].splice(ni, 0, item); }
    else if (dir === 1 && day < days.length - 1) { days[day].splice(idx, 1); days[day + 1].unshift(item); }
    else if (dir === -1 && day > 0) { days[day].splice(idx, 1); days[day - 1].push(item); }
    return { ...p, days };
  });
  const remove = (day: number, idx: number) => setPlan((p) => ({ ...p, days: p.days.map((d, i) => (i === day ? d.filter((_, j) => j !== idx) : d)) }));
  const onDrop = (day: number, e: React.DragEvent) => { e.preventDefault(); try { const { from, idx } = JSON.parse(e.dataTransfer.getData('text/plain')); setPlan((p) => { const days = p.days.map((d) => [...d]); const [it] = days[from].splice(idx, 1); days[day].push(it); return { ...p, days }; }); } catch {} };

  async function doShare() {
    setShare({ url: '', state: 'saving' });
    const body = { title: plan.title || 'My Chandler trip', startDate: plan.startDate || null, endDate: plan.endDate || null, interests: plan.interests, days: plan.days.map((d, i) => ({ day: i + 1, items: d.map((x) => ({ kind: x.kind, id: x.id, note: x.note })) })) };
    try {
      const toks = JSON.parse(localStorage.getItem(TOK) || 'null');
      let shareToken = toks?.shareToken;
      if (toks?.shareToken && toks?.editToken) { const r = await fetch(`/api/itineraries/${toks.shareToken}/`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ editToken: toks.editToken, itinerary: body }) }); if (!r.ok) shareToken = null; }
      if (!shareToken) { const r = await fetch('/api/itineraries/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json(); if (!r.ok) throw new Error(j.error); localStorage.setItem(TOK, JSON.stringify(j)); shareToken = j.shareToken; }
      const url = `${location.origin}/trip-planner/${shareToken}/`;
      setShare({ url, state: 'done' }); track('visit', 'itinerary_share');
      try { if (navigator.share) await navigator.share({ title: plan.title, url }); else await navigator.clipboard.writeText(url); } catch {}
    } catch { setShare({ url: '', state: 'error' }); }
  }

  const all = plan.days.flat();
  const points = useMemo(() => all.filter((x) => x.lat && x.lng).map((x) => ({ kind: x.kind, id: x.id, name: x.name, cat: x.kind === 'event' ? 'event' : 'attraction', sub: x.category, lat: x.lat!, lng: x.lng!, href: x.href, image: x.image, badge: `Day ${plan.days.findIndex((d) => d.includes(x)) + 1}` })), [all, plan.days]);
  const savedNotInPlan = saved.filter((s) => !inPlan(s));
  const field = 'mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-navy';

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 print:py-0">
      <div className="grid gap-10 lg:grid-cols-12">
        {/* Left: setup + sources */}
        <div className="space-y-8 lg:col-span-4 print:hidden">
          <section className="rounded-[var(--radius-card)] bg-mist p-6" aria-labelledby="trip-setup">
            <h2 id="trip-setup" className="text-lg font-bold text-navy">1 · Your trip</h2>
            <label className="mt-4 block text-sm font-semibold">Trip name<input value={plan.title} onChange={(e) => setPlan({ ...plan, title: e.target.value })} className={field} maxLength={120} /></label>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold">Arrive<input type="date" value={plan.startDate} onChange={(e) => setPlan({ ...plan, startDate: e.target.value })} className={field} /></label>
              <label className="text-sm font-semibold">Depart<input type="date" min={plan.startDate} value={plan.endDate} onChange={(e) => setPlan({ ...plan, endDate: e.target.value })} className={field} /></label>
            </div>
            <fieldset className="mt-5"><legend className="text-sm font-semibold">Interests</legend>
              <div className="mt-2 flex flex-wrap gap-2">{INTERESTS.map((i) => { const on = plan.interests.includes(i.key); return (
                <button key={i.key} type="button" aria-pressed={on} onClick={() => setPlan({ ...plan, interests: on ? plan.interests.filter((x) => x !== i.key) : [...plan.interests, i.key] })} className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${on ? 'bg-navy text-white ring-navy' : 'bg-white ring-line'}`}>{on && <Check className="mr-1 inline size-3" aria-hidden />}{i.label}</button>); })}</div>
            </fieldset>
          </section>

          <section className="rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-line" aria-labelledby="trip-add">
            <h2 id="trip-add" className="text-lg font-bold text-navy">2 · Add places</h2>
            <div className="mt-4 flex items-center gap-2 rounded-full bg-mist px-4"><Search className="size-4 text-blue-500" aria-hidden /><label htmlFor="tp-q" className="sr-only">Search places and events</label>
              <input id="tp-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hotels, restaurants, events…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" />{searching && <Loader2 className="size-4 animate-spin" aria-hidden />}</div>
            <ul className="mt-3 max-h-72 space-y-1 overflow-auto" aria-live="polite">{results.map((r) => (
              <li key={r.kind + r.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-mist"><div className="min-w-0"><p className="truncate text-sm font-semibold">{r.name}</p><p className="truncate text-xs text-ink-soft">{r.kind === 'event' ? 'Event' : r.category ?? (r as any).sub}</p></div>
                <button type="button" onClick={() => add({ ...r, category: (r as any).sub })} disabled={inPlan(r)} aria-label={`Add ${r.name} to day ${activeDay + 1}`} className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-500 text-white disabled:bg-teal-400 disabled:text-navy">{inPlan(r) ? <Check className="size-4" /> : <Plus className="size-4" />}</button></li>
            ))}</ul>
            {savedNotInPlan.length > 0 && (<><h3 className="mt-6 text-sm font-bold text-navy">Your saved places ({savedNotInPlan.length})</h3>
              <ul className="mt-2 space-y-1">{savedNotInPlan.map((s) => (
                <li key={s.kind + s.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-mist"><Link href={s.href} className="min-w-0 truncate text-sm font-semibold hover:underline">{s.name}</Link>
                  <div className="flex gap-1"><button type="button" onClick={() => add(s)} aria-label={`Add ${s.name} to day ${activeDay + 1}`} className="grid size-8 place-items-center rounded-full bg-blue-500 text-white"><Plus className="size-4" /></button>
                    <button type="button" onClick={() => writeSaved(saved.filter((x) => !(x.kind === s.kind && x.id === s.id)))} aria-label={`Remove ${s.name} from saved`} className="grid size-8 place-items-center rounded-full ring-1 ring-line"><Trash2 className="size-3.5" /></button></div></li>
              ))}</ul></>)}
            {suggest.length > 0 && (<><h3 className="mt-6 flex items-center gap-1.5 text-sm font-bold text-navy"><Sparkles className="size-4 text-teal-600" aria-hidden />Ideas for your interests</h3>
              <ul className="mt-2 space-y-1">{suggest.filter((s) => !inPlan(s)).map((s) => (
                <li key={s.kind + s.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-mist"><Link href={s.href} className="min-w-0 truncate text-sm font-semibold hover:underline">{s.name}</Link><button type="button" onClick={() => add({ ...s, category: (s as any).sub })} aria-label={`Add ${s.name}`} className="grid size-8 place-items-center rounded-full bg-blue-500 text-white"><Plus className="size-4" /></button></li>
              ))}</ul><p className="mt-2 text-xs text-ink-soft">Suggestions are drawn from the official directory.</p></>)}
          </section>
        </div>

        {/* Right: itinerary */}
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow text-teal-700 print:hidden">3 · Your itinerary</p><h2 className="mt-2 font-display text-5xl text-navy">{plan.title || 'My Chandler trip'}</h2>
              {plan.startDate && <p className="mt-1 flex items-center gap-2 text-ink-soft"><CalendarDays className="size-4" aria-hidden />{new Date(plan.startDate + 'T12:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}{plan.endDate && ` – ${new Date(plan.endDate + 'T12:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}</p>}</div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <button type="button" onClick={doShare} disabled={!all.length || share.state === 'saving'} className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-5 py-3 text-sm font-bold text-white hover:bg-navy disabled:opacity-50">{share.state === 'saving' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Share2 className="size-4" aria-hidden />}Save & share</button>
              <button type="button" onClick={() => window.print()} disabled={!all.length} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold ring-1 ring-line hover:bg-mist disabled:opacity-50"><Printer className="size-4" aria-hidden />Print / PDF</button>
              {!plan.startDate && <button type="button" onClick={() => setPlan((p) => ({ ...p, days: [...p.days, []] }))} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold ring-1 ring-line hover:bg-mist"><Plus className="size-4" aria-hidden />Add day</button>}
              <button type="button" onClick={() => { if (confirm('Clear this itinerary?')) { setPlan(blank()); localStorage.removeItem(TOK); } }} className="rounded-full px-4 py-3 text-sm font-semibold text-ink-soft hover:text-red-700">Clear</button>
            </div>
          </div>
          <div role="status" aria-live="polite" className="print:hidden">
            {share.state === 'done' && <p className="mt-4 rounded-xl bg-teal-50 px-4 py-3 text-sm">Saved. Share link (copied): <a href={share.url} className="break-all font-semibold underline">{share.url}</a></p>}
            {share.state === 'error' && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">Could not save right now — your plan is still stored on this device.</p>}
          </div>

          <ol className="mt-8 space-y-6">
            {plan.days.map((d, di) => (
              <li key={di} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(di, e)} onClick={() => setActiveDay(di)}
                className={`rounded-[var(--radius-card)] p-5 ring-1 transition break-inside-avoid ${activeDay === di ? 'bg-white ring-blue-500 shadow-[0_20px_50px_-30px_rgba(33,79,161,.5)]' : 'bg-mist ring-transparent'}`}>
                <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-navy">Day {di + 1}{plan.startDate && <span className="ml-2 text-sm font-medium text-ink-soft">{new Date(new Date(plan.startDate + 'T12:00').getTime() + di * 864e5).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>}</h3>
                  {activeDay === di && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 print:hidden">Adding to this day</span>}</div>
                {d.length === 0 ? <p className="mt-3 text-sm text-ink-soft">Nothing planned yet — search or add saved places{plan.days.length > 1 && ', or drag items here'}.</p> : (
                  <ul className="mt-4 space-y-2">{d.map((it, ii) => (
                    <li key={it.kind + it.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ from: di, idx: ii }))} className="flex items-center gap-3 rounded-xl bg-white p-2 ring-1 ring-line">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white">{ii + 1}</span>
                      {it.image && <img src={it.image} alt="" className="size-12 shrink-0 rounded-lg object-cover print:hidden" />}
                      <div className="min-w-0 flex-1"><Link href={it.href} className="block truncate font-semibold text-navy hover:underline">{it.name}</Link><p className="truncate text-xs text-ink-soft">{it.kind === 'event' ? 'Event' : it.category}</p>
                        <label className="sr-only" htmlFor={`note-${it.kind}-${it.id}`}>Note for {it.name}</label>
                        <input id={`note-${it.kind}-${it.id}`} value={it.note ?? ''} onChange={(e) => setPlan((p) => ({ ...p, days: p.days.map((dd, x) => (x === di ? dd.map((y, z) => (z === ii ? { ...y, note: e.target.value } : y)) : dd)) }))} placeholder="Add a note (time, reservation…)" maxLength={300} className="mt-1 w-full bg-transparent text-xs outline-none placeholder:text-ink-soft/50" /></div>
                      <div className="flex shrink-0 gap-1 print:hidden">
                        <button type="button" onClick={() => move(di, ii, -1)} aria-label={`Move ${it.name} earlier`} className="grid size-8 place-items-center rounded-full hover:bg-mist"><ArrowUp className="size-4" /></button>
                        <button type="button" onClick={() => move(di, ii, 1)} aria-label={`Move ${it.name} later`} className="grid size-8 place-items-center rounded-full hover:bg-mist"><ArrowDown className="size-4" /></button>
                        <button type="button" onClick={() => remove(di, ii)} aria-label={`Remove ${it.name}`} className="grid size-8 place-items-center rounded-full hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></button>
                      </div>
                    </li>
                  ))}</ul>
                )}
              </li>
            ))}
          </ol>
          {points.length > 0 && <div className="mt-10 overflow-hidden rounded-[var(--radius-card)] ring-1 ring-line print:hidden"><p className="flex items-center gap-2 bg-mist px-4 py-3 text-sm font-semibold"><MapPin className="size-4" aria-hidden />Your trip on the map</p><MapView points={points} categories={VISIT_MAP_CATEGORIES.filter((c) => ['do', 'events'].includes(c.key))} height="420px" compact /></div>}
        </div>
      </div>
    </div>
  );
}
