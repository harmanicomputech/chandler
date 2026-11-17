'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type E = { id: number; slug: string; title: string; start: string | null; end: string | null };
/** Month grid. Multi-day events appear on every day they span. Keyboard navigable; events are real links. */
export function EventsCalendar({ events }: { events: E[] }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const days = useMemo(() => {
    const first = new Date(ym.y, ym.m, 1); const start = new Date(first); start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [ym]);
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const on = (d: Date) => { const k = key(d); return events.filter((e) => e.start && e.start <= k && (e.end ?? e.start) >= k); };
  const label = new Date(ym.y, ym.m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const shift = (n: number) => setYm(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  return (
    <div className="mt-6 overflow-hidden rounded-[var(--radius-card)] ring-1 ring-line">
      <div className="flex items-center justify-between bg-navy px-5 py-4 text-white">
        <button onClick={() => shift(-1)} aria-label="Previous month" className="grid size-9 place-items-center rounded-full hover:bg-white/10"><ChevronLeft className="size-5" /></button>
        <h3 className="font-display text-3xl" aria-live="polite">{label}</h3>
        <button onClick={() => shift(1)} aria-label="Next month" className="grid size-9 place-items-center rounded-full hover:bg-white/10"><ChevronRight className="size-5" /></button>
      </div>
      <div role="grid" aria-label={label} className="grid grid-cols-7 text-sm">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} role="columnheader" className="border-b border-line bg-mist py-2 text-center text-xs font-bold uppercase tracking-wider text-ink-soft">{d}</div>)}
        {days.map((d) => {
          const list = on(d); const inMonth = d.getMonth() === ym.m; const today = key(d) === key(now);
          return (
            <div key={key(d)} role="gridcell" className={`min-h-[110px] border-b border-r border-line p-1.5 ${inMonth ? 'bg-white' : 'bg-mist/60 text-ink-soft/50'}`}>
              <p className={`mb-1 grid size-7 place-items-center rounded-full text-xs font-bold ${today ? 'bg-teal-400 text-navy' : ''}`}>{d.getDate()}</p>
              <ul className="space-y-1">{list.slice(0, 3).map((e) => <li key={e.id}><Link href={`/event/${e.slug}/${e.id}/`} className="block truncate rounded-md bg-blue-50 px-1.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-500 hover:text-white">{e.title}</Link></li>)}
                {list.length > 3 && <li className="px-1.5 text-[11px] text-ink-soft">+{list.length - 3} more</li>}</ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
