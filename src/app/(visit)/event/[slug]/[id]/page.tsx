import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { CalendarDays, Clock, MapPin, Ticket, ExternalLink, User } from 'lucide-react';
import { getEvent, queryEvents } from '@/lib/content';
import { sanitizeHtml, excerpt } from '@/lib/sanitize';
import { Breadcrumbs } from '@/components/visit/PageHero';
import { Img } from '@/components/shared/Img';
import { JsonLd } from '@/components/shared/JsonLd';
import { SaveButton } from '@/components/visit/SaveButton';
import { EventCardView, eventHref, fmtDateRange } from '@/components/visit/Cards';
import { MiniMap } from '@/components/visit/MiniMap';
import { TrackView, OutboundLink } from '@/components/visit/TrackView';
import { ShareButtons } from '@/components/visit/ShareButtons';
import { followRedirect } from '@/lib/redirects';

type P = { params: Promise<{ slug: string; id: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const e = await getEvent(Number((await params).id)); if (!e) return {};
  return { title: `${e.title}`, description: e.seoDescription ?? excerpt(e.descriptionHtml, 160), alternates: { canonical: eventHref(e) }, openGraph: { images: e.image?.url ? [e.image.url] : undefined } };
}

export default async function EventPage({ params }: P) {
  const { slug, id } = await params;
  const e = await getEvent(Number(id));
  if (!e) { await followRedirect('visit', `/event/${slug}/${id}/`); notFound(); }
  if (decodeURIComponent(slug) !== e.slug) permanentRedirect(eventHref(e));
  const more = (await queryEvents({ category: e.categories[0], limit: 4 })).rows.filter((x) => x.id !== e.id).slice(0, 3);
  const when = fmtDateRange(e.startDate, e.endDate);
  const ics = `/api/events/${e.id}/ics/`;
  return (
    <article>
      <TrackView site="visit" name="event_view" entity="event" id={e.id} />
      {e.startDate && <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Event', name: e.title, startDate: e.startDate, endDate: e.endDate ?? undefined, description: excerpt(e.descriptionHtml, 300), image: e.image?.url ?? undefined, eventStatus: 'https://schema.org/EventScheduled',
        location: e.locationName ? { '@type': 'Place', name: e.locationName, address: e.address ?? undefined } : undefined, organizer: e.hostName ? { '@type': 'Organization', name: e.hostName } : undefined }} />}
      <header className="relative isolate overflow-hidden bg-navy-950 pt-28 text-white">
        <div className="absolute inset-0 -z-10 opacity-40"><Img src={e.image?.url} alt="" fill sizes="100vw" className="object-cover blur-2xl scale-110" /></div>
        <div className="mx-auto grid max-w-[1440px] items-end gap-10 px-5 pb-14 sm:px-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Breadcrumbs tone="dark" items={[{ label: 'Home', href: '/' }, { label: 'Events', href: '/events/' }, { label: e.title, href: eventHref(e) }]} />
            <ul className="mt-8 flex flex-wrap gap-2">{e.categories.map((c) => <li key={c} className="rounded-full bg-teal-400 px-3 py-1 text-xs font-bold text-navy">{c}</li>)}</ul>
            <h1 className="mt-5 font-display text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.92]">{e.title}</h1>
            <div className="mt-8 flex flex-wrap gap-3"><SaveButton variant="pill" item={{ kind: 'event', id: e.id, name: e.title, href: eventHref(e), image: e.image?.url, lat: e.latitude, lng: e.longitude, category: e.categories[0] }} />
              <a href={ics} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-bold ring-1 ring-white/25 hover:bg-white/20"><CalendarDays className="size-4" aria-hidden />Add to calendar</a>
              <ShareButtons title={e.title} /></div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] lg:col-span-5"><Img src={e.image?.url} alt={e.image?.alt || e.title} fill priority sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" /></div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1440px] gap-14 px-5 py-16 sm:px-8 lg:grid-cols-12">
        <div className="prose-vc lg:col-span-7" dangerouslySetInnerHTML={{ __html: sanitizeHtml(e.descriptionHtml) }} />
        <aside className="lg:col-span-5"><div className="sticky top-28 overflow-hidden rounded-[var(--radius-card)] ring-1 ring-line">
          {e.latitude && e.longitude && <MiniMap lat={e.latitude} lng={e.longitude} label={e.locationName ?? e.title} />}
          <div className="space-y-5 p-7 text-navy">
            {(when || e.recurrenceText) && <div className="flex gap-3"><CalendarDays className="size-5 text-teal-600" aria-hidden /><div><span className="sr-only">Dates</span><div className="font-semibold">{when}</div>{e.recurrenceText && <div className="text-sm text-ink-soft">{e.recurrenceText}</div>}</div></div>}
            {e.timesText && <div className="flex gap-3"><Clock className="size-5 text-teal-600" aria-hidden /><span className="sr-only">Times</span><div>{e.timesText}</div></div>}
            {e.locationName && <div className="flex gap-3"><MapPin className="size-5 text-teal-600" aria-hidden /><div><span className="sr-only">Location</span><div className="font-semibold">{e.locationName}</div>{e.address && <div className="text-sm text-ink-soft">{e.address}</div>}</div></div>}
            {e.admission && <div className="flex gap-3"><Ticket className="size-5 text-teal-600" aria-hidden /><span className="sr-only">Admission</span><div>{e.admission}</div></div>}
            {e.hostName && <div className="flex gap-3"><User className="size-5 text-teal-600" aria-hidden /><span className="sr-only">Host</span><div>Hosted by {e.hostName}</div></div>}
          </div>
          {e.website && <div className="px-7 pb-7"><OutboundLink href={e.website} event="website_click" id={e.id} entity="event" className="flex items-center justify-center gap-2 rounded-full bg-blue-500 py-4 font-bold text-white hover:bg-navy">Event website<ExternalLink className="size-4" aria-hidden /></OutboundLink></div>}
          <p className="border-t border-line px-7 py-4 text-xs text-ink-soft">Event details are supplied by the organizer. Please confirm dates, times and admission before attending.</p>
        </div></aside>
      </div>
      {more.length > 0 && <section className="bg-mist py-20"><div className="mx-auto max-w-[1440px] px-5 sm:px-8"><h2 className="font-display text-5xl text-navy">More {e.categories[0]?.toLowerCase() ?? ''} events</h2><div className="mt-10 grid gap-6 md:grid-cols-3">{more.map((m) => <EventCardView key={m.id} e={m} />)}</div></div></section>}
    </article>
  );
}
