import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AlertTriangle, Phone, FileText } from 'lucide-react';
import { getProperty } from '@/lib/edo-content';
import { EdoHero } from '@/components/edo/EdoHero';
import { SmartForm } from '@/components/shared/SmartForm';
import { FORMS } from '@/lib/forms';
import { MiniMap } from '@/components/visit/MiniMap';
import { TrackView } from '@/components/visit/TrackView';
import { edo } from '@/lib/edo';
type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> { const r = await getProperty((await params).slug); return r ? { title: r.p.name, robots: r.p.isFixture ? { index: false } : undefined } : {}; }
export default async function PropertyPage({ params }: P) {
  const r = await getProperty((await params).slug); if (!r) notFound();
  const p = r.p;
  const facts: [string, string][] = [['Property type', p.type], ['District', r.district ?? '—'], ['Available', p.availableSqft ? `${p.availableSqft.toLocaleString()} SF` : '—'], ['Total', p.totalSqft ? `${p.totalSqft.toLocaleString()} SF` : '—'], ['Land', p.acreage ? `${p.acreage} acres` : '—'], ['Zoning', p.zoning ? `${p.zoning}${p.zoningVerified ? '' : ' (unverified)'}` : '—'], ['Status', p.availability]];
  return (<>
    <TrackView site="edo" name="property_view" entity="property" id={p.id} />
    <EdoHero title={p.name} eyebrow={`${p.type} · ${r.district ?? 'Chandler'}`} summary={p.address} crumbs={[{ label: 'Economic Development', href: edo('/') }, { label: 'Properties', href: edo('/properties/') }, { label: p.name, href: '#' }]} />
    <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-14 sm:px-8 lg:grid-cols-12">
      <div className="lg:col-span-7">
        {p.isFixture && <p role="note" className="mb-8 flex gap-3 border-l-4 border-edo-gold bg-[#fff8ea] p-4 text-sm"><AlertTriangle className="size-5 shrink-0 text-[#9a6b12]" aria-hidden />This is a demonstration record, not a real property listing.</p>}
        <dl className="grid grid-cols-2 gap-px bg-edo-line sm:grid-cols-3">{facts.map(([k, v]) => <div key={k} className="bg-white p-5"><dt className="font-mono text-[11px] uppercase tracking-wider text-edo-slate">{k}</dt><dd className="mt-1 font-[family-name:var(--font-edo-display)] text-lg font-bold capitalize text-edo-navy">{v}</dd></div>)}</dl>
        {p.description && <p className="mt-8 text-lg leading-relaxed text-edo-slate">{p.description}</p>}
        {p.documents.length > 0 && <ul className="mt-8 space-y-2">{p.documents.map((d) => <li key={d.url}><a href={d.url} className="inline-flex items-center gap-2 font-semibold text-edo-skytext"><FileText className="size-4" aria-hidden />{d.label}</a></li>)}</ul>}
        <div className="mt-10 border border-edo-line bg-edo-paper p-6 sm:p-8"><h2 className="font-[family-name:var(--font-edo-display)] text-2xl font-bold text-edo-navy">Ask about this property</h2><div className="mt-6"><SmartForm formKey="property-enquiry" spec={FORMS['property-enquiry']} theme="edo" extra={{ entityId: p.id }} /></div></div>
      </div>
      <aside className="space-y-6 lg:col-span-5">
        {p.latitude && p.longitude && <div className="overflow-hidden border border-edo-line"><MiniMap lat={p.latitude} lng={p.longitude} label={p.name} /></div>}
        <div className="border border-edo-line p-6"><p className="font-mono text-[11px] uppercase tracking-wider text-edo-slate">Contact</p><p className="mt-2 font-semibold text-edo-navy">{p.contactName}</p>{p.contactPhone && <a href={`tel:${p.contactPhone}`} className="mt-2 inline-flex items-center gap-2 font-mono text-edo-skytext"><Phone className="size-4" aria-hidden />{p.contactPhone}</a>}</div>
      </aside>
    </div>
  </>);
}
