import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, Clock, MapPin, ArrowRight } from 'lucide-react';
import { getEdoEvent } from '@/lib/edo-content';
import { sanitizeHtml, excerpt } from '@/lib/sanitize';
import { EdoHero } from '@/components/edo/EdoHero';
import { JsonLd } from '@/components/shared/JsonLd';
import { MiniMap } from '@/components/visit/MiniMap';
import { edo } from '@/lib/edo';
type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> { const r = await getEdoEvent((await params).slug); return r ? { title: r.e.title, description: excerpt(r.e.descriptionHtml, 160) } : {}; }
export default async function EdoEvent({ params }: P) {
  const r = await getEdoEvent((await params).slug); if (!r) notFound();
  const e = r.e; const d = e.startDate ? new Date(e.startDate + 'T12:00:00') : null;
  const internal = e.website?.startsWith('/') ?? false;
  return (<>
    {e.startDate && <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Event', name: e.title, startDate: e.startDate, eventStatus: 'https://schema.org/EventScheduled', description: excerpt(e.descriptionHtml, 300), organizer: { '@type': 'GovernmentOrganization', name: 'City of Chandler Economic Development' }, location: e.locationName ? { '@type': 'Place', name: e.locationName, address: e.address ?? undefined } : undefined }} />}
    <EdoHero title={e.title} eyebrow={e.categories.join(' · ')} image={r.img} crumbs={[{ label: 'Economic Development', href: edo('/') }, { label: 'Events', href: edo('/events/') }, { label: e.title, href: '#' }]} />
    <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-14 sm:px-8 lg:grid-cols-12">
      <div className="prose-edo lg:col-span-7" dangerouslySetInnerHTML={{ __html: sanitizeHtml(e.descriptionHtml) }} />
      <aside className="space-y-6 lg:col-span-5"><div className="border border-edo-line">
        {e.latitude && e.longitude && <MiniMap lat={e.latitude} lng={e.longitude} label={e.locationName ?? e.title} />}
        <ul className="space-y-4 p-6 text-sm text-edo-ink">
          <li className="flex gap-3"><CalendarDays className="size-5 text-edo-skytext" aria-hidden /><span><span className="sr-only">Date: </span>{d ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : e.recurrenceText}</span></li>
          {e.timesText && <li className="flex gap-3"><Clock className="size-5 text-edo-skytext" aria-hidden /><span><span className="sr-only">Time: </span>{e.timesText}</span></li>}
          {e.locationName && <li className="flex gap-3"><MapPin className="size-5 text-edo-skytext" aria-hidden /><span><span className="sr-only">Location: </span>{e.locationName}{e.address && <><br /><span className="text-edo-slate">{e.address}</span></>}</span></li>}
        </ul>
        {e.website && <div className="border-t border-edo-line p-6">{internal ? <Link href={e.website} className="inline-flex items-center gap-2 bg-edo-navy px-5 py-3 text-sm font-semibold text-white hover:bg-edo-sky">Details & registration <ArrowRight className="size-4" aria-hidden /></Link> : <a href={e.website} className="inline-flex items-center gap-2 bg-edo-navy px-5 py-3 text-sm font-semibold text-white">Event website</a>}</div>}
      </div>
      {e.sourceUrl && <p className="font-mono text-[11px] text-edo-slate">Source: <a href={e.sourceUrl} className="underline">{e.sourceUrl}</a></p>}</aside>
    </div>
  </>);
}
