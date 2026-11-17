import type { Metadata } from 'next';
import { Download } from 'lucide-react';
import { getReports } from '@/lib/edo-content';
import { EdoHero } from '@/components/edo/EdoHero';
import { DownloadLink } from '@/components/edo/Beacons';
import { edo } from '@/lib/edo';
export const metadata: Metadata = { title: 'Reports & Downloads' };
export default async function Reports() {
  const rows = await getReports();
  return (<>
    <EdoHero title="Reports & downloads" eyebrow="Resources" summary="Brochures, community profiles, incentive documents and guides published by the City of Chandler." crumbs={[{ label: 'Economic Development', href: edo('/') }, { label: 'Reports', href: edo('/reports/') }]} />
    <ul className="mx-auto grid max-w-[1440px] gap-px bg-edo-line px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">{rows.map((r) => (
      <li key={r.id} className="bg-white"><DownloadLink id={r.id} href={r.fileUrl} className="group flex h-full items-start justify-between gap-4 p-6 hover:bg-edo-paper"><span><span className="font-mono text-[11px] uppercase tracking-wider text-edo-skytext">{r.category}{r.publishedOn && ` · ${r.publishedOn.slice(0, 4)}`}</span><span className="mt-2 block font-semibold text-edo-navy group-hover:underline">{r.title}</span><span className="mt-1 block text-xs text-edo-slate">PDF · hosted on chandleraz.gov</span></span><Download className="size-5 shrink-0 text-edo-skytext" aria-hidden /></DownloadLink></li>
    ))}</ul>
  </>);
}
