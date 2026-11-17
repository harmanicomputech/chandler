import type { Metadata } from 'next';
import Link from 'next/link';
import { queryProperties } from '@/lib/edo-content';
import { EdoHero } from '@/components/edo/EdoHero';
import { edo } from '@/lib/edo';
import { CompareBeacon } from '@/components/edo/Beacons';
export const metadata: Metadata = { title: 'Compare properties', robots: { index: false } };
export default async function Compare({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const ids = ((await searchParams).ids ?? '').split(',').map(Number).filter(Boolean).slice(0, 4);
  const rows = ids.length ? await queryProperties({ ids }) : [];
  const fields: [string, (r: (typeof rows)[number]) => string][] = [
    ['Type', (r) => r.p.type], ['District', (r) => r.district ?? '—'], ['Available area', (r) => r.p.availableSqft ? `${r.p.availableSqft.toLocaleString()} SF` : '—'], ['Total area', (r) => r.p.totalSqft ? `${r.p.totalSqft.toLocaleString()} SF` : '—'],
    ['Land', (r) => r.p.acreage ? `${r.p.acreage} acres` : '—'], ['Zoning', (r) => r.p.zoning ? `${r.p.zoning}${r.p.zoningVerified ? ' (verified)' : ' (unverified)'}` : '—'], ['Availability', (r) => r.p.availability], ['Record type', (r) => r.p.isFixture ? 'Demonstration fixture' : 'Live listing'],
  ];
  return (<>
    <CompareBeacon ids={ids} />
    <EdoHero title="Compare properties" crumbs={[{ label: 'Economic Development', href: edo('/') }, { label: 'Properties', href: edo('/properties/') }, { label: 'Compare', href: '#' }]} />
    <div className="mx-auto max-w-[1440px] overflow-x-auto px-5 py-12 sm:px-8">
      {rows.length < 2 ? <p className="text-edo-slate">Select at least two properties in the <Link href={edo('/properties/')} className="text-edo-skytext underline">explorer</Link> to compare.</p> : (
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <caption className="sr-only">Side-by-side property comparison</caption>
          <thead><tr><th scope="col" className="w-48 border-b-2 border-edo-navy p-3 font-mono text-[11px] uppercase text-edo-slate">Attribute</th>{rows.map((r) => <th key={r.p.id} scope="col" className="border-b-2 border-edo-navy p-3"><Link href={edo(`/properties/${r.p.slug}/`)} className="font-[family-name:var(--font-edo-display)] text-base font-bold text-edo-navy hover:underline">{r.p.name}</Link></th>)}</tr></thead>
          <tbody>{fields.map(([l, f]) => <tr key={l} className="border-b border-edo-line"><th scope="row" className="p-3 font-medium text-edo-slate">{l}</th>{rows.map((r) => <td key={r.p.id} className="p-3 font-mono capitalize">{f(r)}</td>)}</tr>)}</tbody>
        </table>
      )}
    </div>
  </>);
}
