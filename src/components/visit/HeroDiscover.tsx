'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, BedDouble, UtensilsCrossed, Compass, CalendarDays } from 'lucide-react';

const TABS = [
  { key: 'do', label: 'Things to do', icon: Compass, action: '/things-to-do/top-attractions/', placeholder: 'Hiking, museums, golf, ballooning…' },
  { key: 'eat', label: 'Eat & drink', icon: UtensilsCrossed, action: '/restaurants/', placeholder: 'Mexican, brunch, breweries, steak…' },
  { key: 'stay', label: 'Stay', icon: BedDouble, action: '/hotels/', placeholder: 'Resort, downtown, pet-friendly…' },
  { key: 'events', label: 'Events', icon: CalendarDays, action: '/events/', placeholder: 'Festivals, concerts, this weekend…' },
];

/** Hero discovery panel: category-scoped search that lands on the real, filterable directory. */
export function HeroDiscover() {
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState('');
  const router = useRouter();
  const t = TABS[tab];
  return (
    <div className="w-full max-w-3xl rounded-[28px] bg-white/10 p-2 ring-1 ring-white/20 backdrop-blur-xl" style={{ animation: 'rise 1s var(--ease-out-expo) .9s both' }}>
      <div role="tablist" aria-label="What are you looking for?" className="flex gap-1 overflow-x-auto p-1 [scrollbar-width:none]">
        {TABS.map((x, i) => (
          <button key={x.key} role="tab" type="button" aria-selected={tab === i} onClick={() => setTab(i)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${tab === i ? 'bg-white text-navy shadow-lg' : 'text-white/85 hover:bg-white/10'}`}>
            <x.icon className="size-4" aria-hidden />{x.label}
          </button>
        ))}
      </div>
      <form role="search" onSubmit={(e) => { e.preventDefault(); router.push(`${t.action}${q ? `?q=${encodeURIComponent(q)}` : ''}`); }} className="mt-1 flex items-center gap-2 rounded-[22px] bg-white p-2 pl-5">
        <Search className="size-5 shrink-0 text-blue-500" aria-hidden />
        <label htmlFor="hero-q" className="sr-only">Search {t.label}</label>
        <input id="hero-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.placeholder} className="min-w-0 flex-1 bg-transparent py-3 text-[16px] text-navy outline-none placeholder:text-ink-soft/60" />
        <button className="rounded-2xl bg-blue-500 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-navy">Explore</button>
      </form>
    </div>
  );
}
