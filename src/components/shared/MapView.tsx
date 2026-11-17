'use client';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { List, Map as MapIcon, Navigation, X, Search } from 'lucide-react';
import { track } from './track';

export type MapPoint = { kind: string; id: number; name: string; cat: string; sub?: string | null; lat: number; lng: number; address?: string | null; image?: string | null; href: string; badge?: string };
export type Category = { key: string; label: string; color: string; match: (p: MapPoint) => boolean };

const TILE = process.env.NEXT_PUBLIC_MAP_TILE_URL ?? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const ATTR = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/**
 * Accessible interactive map.
 *  - Canvas-rendered markers (fast with 1,000+ points), category filters, keyword filter.
 *  - Map ⇄ list toggle; the list is a complete non-map alternative (keyboard & screen-reader friendly).
 *  - Detail card with directions link (opens the visitor's own maps app; no API key needed).
 */
export function MapView({ points: initial, source, categories, height = '70vh', site = 'visit', compact = false, center = [33.3062, -111.8413], zoom = 12 }:
  { points?: MapPoint[]; source?: string; categories: Category[]; height?: string; site?: 'visit' | 'edo'; compact?: boolean; center?: [number, number]; zoom?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const [points, setPoints] = useState<MapPoint[]>(initial ?? []);
  const [active, setActive] = useState<Set<string>>(new Set(categories.map((c) => c.key)));
  const [q, setQ] = useState('');
  const [view, setView] = useState<'map' | 'list'>('map');
  const [sel, setSel] = useState<MapPoint | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(initial ? 'ready' : 'loading');
  const [mapReady, setMapReady] = useState(false);
  const edo = site === 'edo';

  useEffect(() => { if (initial) setPoints(initial); }, [initial]);
  useEffect(() => {
    if (!source) return;
    fetch(source).then((r) => r.json()).then((j) => { setPoints(j.points); setStatus('ready'); }).catch(() => setStatus('error'));
  }, [source]);

  const catOf = (p: MapPoint) => categories.find((c) => c.match(p));
  const visible = useMemo(() => points.filter((p) => { const c = catOf(p); return c && active.has(c.key) && (!q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.sub ?? '').toLowerCase().includes(q.toLowerCase())); }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points, active, q]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import('leaflet'); if (cancelled || !el.current || map.current) return;
      L.current = mod;
      const m = mod.map(el.current, { center, zoom, preferCanvas: true, scrollWheelZoom: !compact, zoomControl: false, attributionControl: true });
      mod.control.zoom({ position: 'bottomright' }).addTo(m);
      mod.tileLayer(TILE, { attribution: ATTR, maxZoom: 19, subdomains: 'abcd' }).addTo(m);
      layer.current = mod.layerGroup().addTo(m);
      map.current = m; setMapReady(true);
      m.on('click', () => setSel(null));
      setTimeout(() => m.invalidateSize(), 50);
    })();
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mod = L.current; const lg = layer.current; if (!mod || !lg) return;
    lg.clearLayers();
    for (const p of visible) {
      const c = catOf(p)!;
      const mk = mod.circleMarker([p.lat, p.lng], { radius: sel?.id === p.id && sel.kind === p.kind ? 11 : 7, color: '#fff', weight: 2, fillColor: c.color, fillOpacity: 0.95 });
      mk.bindTooltip(p.name, { direction: 'top', offset: [0, -6] });
      mk.on('click', (e) => { mod.DomEvent.stopPropagation(e); setSel(p); track(site, 'map_interaction', { entity: p.kind, entityId: p.id }); });
      mk.addTo(lg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, sel, status, mapReady]);

  const focus = (p: MapPoint) => { setSel(p); setView('map'); map.current?.flyTo([p.lat, p.lng], 15, { duration: 0.8 }); };
  const toggle = (k: string) => setActive((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n.size ? n : new Set(categories.map((c) => c.key)); });
  const chip = (on: boolean) => edo
    ? `inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ring-1 transition ${on ? 'bg-edo-navy text-white ring-edo-navy' : 'bg-white text-edo-ink ring-edo-line'}`
    : `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${on ? 'bg-navy text-white ring-navy' : 'bg-white text-navy ring-line hover:ring-navy'}`;

  return (
    <div className="relative bg-white">
      <div className={`flex flex-wrap items-center gap-2 border-b p-3 sm:p-4 ${edo ? 'border-edo-line' : 'border-line'}`}>
        <div className={`flex min-w-[200px] flex-1 items-center gap-2 px-3 ring-1 ${edo ? 'rounded-md ring-edo-line' : 'rounded-full ring-line'}`}>
          <Search className="size-4 opacity-60" aria-hidden /><label className="sr-only" htmlFor={`mq-${site}`}>Filter places by name</label>
          <input id={`mq-${site}`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name…" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />
        </div>
        <div role="group" aria-label="Categories" className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button key={c.key} type="button" aria-pressed={active.has(c.key)} onClick={() => toggle(c.key)} className={chip(active.has(c.key))}>
              <span aria-hidden className="size-2.5 rounded-full ring-2 ring-white" style={{ background: c.color }} />{c.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex overflow-hidden rounded-full ring-1 ring-line">
          <button type="button" onClick={() => setView('map')} aria-pressed={view === 'map'} className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold ${view === 'map' ? (edo ? 'bg-edo-navy text-white' : 'bg-blue-500 text-white') : ''}`}><MapIcon className="size-4" aria-hidden />Map</button>
          <button type="button" onClick={() => setView('list')} aria-pressed={view === 'list'} className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold ${view === 'list' ? (edo ? 'bg-edo-navy text-white' : 'bg-blue-500 text-white') : ''}`}><List className="size-4" aria-hidden />List</button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{status === 'ready' ? `${visible.length} places shown` : status === 'loading' ? 'Loading places' : 'Map data unavailable'}</p>
      <div className="relative" style={{ height }}>
        <div ref={el} className={`absolute inset-0 ${view === 'list' ? 'invisible' : ''}`} role="application" aria-label="Interactive map. Use the List view for a keyboard-accessible alternative." />
        {status === 'loading' && <div className="skeleton absolute inset-0" />}
        {status === 'error' && <div className="absolute inset-0 grid place-items-center bg-mist p-6 text-center text-sm">Map data could not be loaded. Please try again later.</div>}
        {view === 'list' && (
          <ul className="absolute inset-0 divide-y divide-line overflow-y-auto bg-white">
            {visible.slice(0, 500).map((p) => (
              <li key={p.kind + p.id} className="flex items-center gap-4 px-4 py-3">
                <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ background: catOf(p)?.color }} />
                <div className="min-w-0 flex-1"><a href={p.href} className="font-semibold hover:underline">{p.name}</a><p className="truncate text-sm opacity-70">{[catOf(p)?.label, p.sub, p.address].filter(Boolean).join(' · ')}</p></div>
                <button type="button" onClick={() => focus(p)} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-line">Show on map</button>
              </li>
            ))}
            {visible.length > 500 && <li className="p-4 text-sm opacity-70">Showing 500 of {visible.length}. Narrow with filters.</li>}
          </ul>
        )}
        {sel && view === 'map' && (
          <div className={`absolute bottom-4 left-4 right-4 z-[500] flex max-w-sm gap-4 bg-white p-3 shadow-2xl ring-1 ring-black/5 sm:right-auto ${edo ? 'rounded-md' : 'rounded-2xl'}`} style={{ animation: 'rise .4s var(--ease-out-expo) both' }}>
            {sel.image && <img src={sel.image} alt="" className={`size-24 shrink-0 object-cover ${edo ? 'rounded' : 'rounded-xl'}`} />}
            <div className="min-w-0 flex-1 py-1">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-60">{catOf(sel)?.label}{sel.badge ? ` · ${sel.badge}` : ''}</p>
              <a href={sel.href} className="mt-0.5 block font-bold leading-snug hover:underline">{sel.name}</a>
              {sel.address && <p className="mt-0.5 truncate text-xs opacity-70">{sel.address}</p>}
              <div className="mt-2 flex gap-3 text-xs font-semibold">
                <a href={sel.href} className={edo ? 'text-edo-sky' : 'text-blue-500'}>Details</a>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${sel.lat},${sel.lng}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1"><Navigation className="size-3" aria-hidden />Directions<span className="sr-only"> (opens in new tab)</span></a>
              </div>
            </div>
            <button type="button" onClick={() => setSel(null)} aria-label="Close details" className="self-start p-1"><X className="size-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
