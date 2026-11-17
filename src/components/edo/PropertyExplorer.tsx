'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, GitCompare, Check } from 'lucide-react';
import { MapView } from '@/components/shared/MapView';
import { EDO_BASE } from '@/lib/edo';
import { track } from '@/components/shared/track';

export type Prop = { id: number; slug: string; name: string; type: string; address: string | null; latitude: number | null; longitude: number | null; availableSqft: number | null; totalSqft: number | null; acreage: number | null; zoning: string | null; zoningVerified: boolean; availability: string; isFixture: boolean; district: string | null; districtSlug: string | null; img: string | null };
const TYPES = [['office', 'Office', '#003C5C'], ['industrial', 'Industrial', '#187DAE'], ['retail', 'Retail', '#11A26F'], ['commercial', 'Commercial', '#5C7A8A'], ['land', 'Land', '#B7862F'], ['development', 'Development', '#7A4E9C']] as const;

/** Client-side explorer: instant filters, synced map + list, shortlist (max 4) for comparison. */
export function PropertyExplorer({ properties, districts }: { properties: Prop[]; districts: { slug: string; name: string }[] }) {
  const [type, setType] = useState(''); const [district, setDistrict] = useState(''); const [min, setMin] = useState(''); const [max, setMax] = useState(''); const [q, setQ] = useState(''); const [sort, setSort] = useState('name');
  const [cmp, setCmp] = useState<number[]>([]);
  const list = useMemo(() => properties.filter((p) => (!type || p.type === type) && (!district || p.districtSlug === district) && (!min || (p.availableSqft ?? 0) >= Number(min)) && (!max || (p.availableSqft ?? Infinity) <= Number(max)) && (!q || `${p.name} ${p.zoning} ${p.district}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => sort === 'size_desc' ? (b.availableSqft ?? 0) - (a.availableSqft ?? 0) : sort === 'size_asc' ? (a.availableSqft ?? 0) - (b.availableSqft ?? 0) : a.name.localeCompare(b.name)), [properties, type, district, min, max, q, sort]);
  const field = 'w-full border border-edo-line bg-white px-3 py-2.5 text-sm';
  const toggle = (id: number) => setCmp((c) => c.includes(id) ? c.filter((x) => x !== id) : c.length >= 4 ? c : [...c, id]);
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8">
      {properties.some((p) => p.isFixture) && <p role="note" className="mb-6 flex items-start gap-3 border-l-4 border-edo-gold bg-[#fff8ea] p-4 text-sm text-edo-ink"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#9a6b12]" aria-hidden /><span><strong>Demonstration data.</strong> These records are development fixtures used to demonstrate search, mapping, comparison and enquiry workflows. They are not real listings. In production this explorer is fed by the City’s licensed property database (GIS Planning / CoStar).</span></p>}
      <form role="search" onSubmit={(e) => { e.preventDefault(); track('edo', 'property_search', { props: { type, district } }); }} className="grid gap-3 border border-edo-line bg-edo-paper p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="text-xs font-semibold lg:col-span-2"><label htmlFor="pe-keyword">Keyword</label><input id="pe-keyword" value={q} onChange={(e) => setQ(e.target.value)} className={field} placeholder="Name, zoning, district" /></div>
        <div className="text-xs font-semibold"><label htmlFor="pe-type">Type</label><select id="pe-type" value={type} onChange={(e) => { setType(e.target.value); track('edo', 'property_search', { props: { type: e.target.value } }); }} className={field}><option value="">All types</option>{TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="text-xs font-semibold"><label htmlFor="pe-district">District</label><select id="pe-district" value={district} onChange={(e) => setDistrict(e.target.value)} className={field}><option value="">All districts</option>{districts.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-2"><div className="text-xs font-semibold"><label htmlFor="pe-min-sf">Min SF</label><input id="pe-min-sf" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} className={field} /></div><div className="text-xs font-semibold"><label htmlFor="pe-max-sf">Max SF</label><input id="pe-max-sf" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} className={field} /></div></div>
        <div className="text-xs font-semibold"><label htmlFor="pe-sort">Sort</label><select id="pe-sort" value={sort} onChange={(e) => setSort(e.target.value)} className={field}><option value="name">Name</option><option value="size_desc">Largest available</option><option value="size_asc">Smallest available</option></select></div>
      </form>
      <p className="mt-4 font-mono text-xs text-edo-slate" aria-live="polite">{list.length} of {properties.length} properties</p>
      <div className="mt-4 grid gap-6 lg:grid-cols-12">
        <div className="overflow-hidden border border-edo-line lg:sticky lg:top-24 lg:col-span-7 lg:self-start">
          <MapView site="edo" points={list.filter((p) => p.latitude).map((p) => ({ kind: 'property', id: p.id, name: p.name, cat: p.type, sub: p.district, lat: p.latitude!, lng: p.longitude!, href: `${EDO_BASE}/properties/${p.slug}/`, address: p.availableSqft ? `${p.availableSqft.toLocaleString()} SF available` : p.acreage ? `${p.acreage} acres` : null, badge: p.isFixture ? 'Demo' : undefined }))}
            categories={TYPES.map(([k, l, c]) => ({ key: k, label: l, color: c, match: (p) => p.cat === k }))} height="620px" />
        </div>
        <ul className="space-y-px bg-edo-line lg:col-span-5">{list.map((p) => (
          <li key={p.id} className="bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div><p className="font-mono text-[11px] uppercase tracking-wider text-edo-skytext">{p.type}{p.district && ` · ${p.district}`}</p><Link href={`${EDO_BASE}/properties/${p.slug}/`} className="mt-1 block font-[family-name:var(--font-edo-display)] text-lg font-bold text-edo-navy hover:underline">{p.name}</Link>{p.isFixture && <span className="mt-1 inline-block bg-[#fff1d6] px-2 py-0.5 font-mono text-[10px] uppercase text-[#7a520c]">Demo record</span>}</div>
              <button type="button" onClick={() => { toggle(p.id); track('edo', 'property_compare', { entity: 'property', entityId: p.id }); }} aria-pressed={cmp.includes(p.id)} disabled={!cmp.includes(p.id) && cmp.length >= 4} className={`inline-flex shrink-0 items-center gap-1.5 border px-3 py-2 text-xs font-semibold disabled:opacity-40 ${cmp.includes(p.id) ? 'border-edo-navy bg-edo-navy text-white' : 'border-edo-line text-edo-navy'}`}>{cmp.includes(p.id) ? <Check className="size-3.5" aria-hidden /> : <GitCompare className="size-3.5" aria-hidden />}Compare</button>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3 font-mono text-xs"><div><dt className="text-edo-slate">Available</dt><dd className="font-medium">{p.availableSqft ? `${p.availableSqft.toLocaleString()} SF` : p.acreage ? `${p.acreage} ac` : '—'}</dd></div><div><dt className="text-edo-slate">Total</dt><dd className="font-medium">{p.totalSqft ? `${p.totalSqft.toLocaleString()} SF` : '—'}</dd></div><div><dt className="text-edo-slate">Zoning</dt><dd className="font-medium">{p.zoning ?? '—'}{p.zoning && !p.zoningVerified && <span className="text-edo-slate">*</span>}</dd></div></dl>
          </li>
        ))}{list.length === 0 && <li className="bg-white p-8 text-center text-sm text-edo-slate">No properties match these filters.</li>}</ul>
      </div>
      <p className="mt-3 font-mono text-[11px] text-edo-slate">* Zoning not yet verified with Development Services.</p>
      {cmp.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-edo-line bg-white/95 shadow-2xl backdrop-blur" style={{ animation: 'rise .4s var(--ease-out-expo) both' }}>
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-5 py-4 sm:px-8"><p className="text-sm font-semibold">{cmp.length} selected (max 4)</p>
            <ul className="flex flex-wrap gap-2">{cmp.map((id) => <li key={id} className="bg-edo-paper px-3 py-1.5 text-xs">{properties.find((p) => p.id === id)?.name}</li>)}</ul>
            <Link href={`${EDO_BASE}/properties/compare/?ids=${cmp.join(',')}`} className="ml-auto bg-edo-navy px-5 py-3 text-sm font-semibold text-white hover:bg-edo-sky">Compare side by side</Link><button type="button" onClick={() => setCmp([])} className="text-sm text-edo-slate underline">Clear</button></div>
        </div>
      )}
    </div>
  );
}
