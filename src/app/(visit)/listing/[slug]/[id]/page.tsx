import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Phone, Globe, Mail, Navigation, Check, ExternalLink } from 'lucide-react';
import { getListing, nearbyListings } from '@/lib/content';
import { sanitizeHtml, excerpt } from '@/lib/sanitize';
import { Breadcrumbs } from '@/components/visit/PageHero';
import { Img } from '@/components/shared/Img';
import { JsonLd } from '@/components/shared/JsonLd';
import { SaveButton } from '@/components/visit/SaveButton';
import { ListingCardView, listingHref } from '@/components/visit/Cards';
import { Gallery } from '@/components/visit/Gallery';
import { MiniMap } from '@/components/visit/MiniMap';
import { TrackView, OutboundLink } from '@/components/visit/TrackView';
import { followRedirect } from '@/lib/redirects';
import { blurFor } from '@/lib/blur';

type P = { params: Promise<{ slug: string; id: string }> };
const SECTION: Record<string, [string, string]> = { hotel: ['Hotels', '/hotels/'], restaurant: ['Restaurants', '/restaurants/'], nightlife: ['Nightlife', '/things-to-do/nightlife/'], park: ['Outdoor Recreation', '/things-to-do/outdoor-recreation/'], trail: ['Outdoor Recreation', '/things-to-do/outdoor-recreation/'], shopping: ['Shopping', '/things-to-do/shopping-in-chandler-az/'], venue: ['Meetings', '/meetings/'], golf: ['Recreation & Sports', '/things-to-do/recreation-sports/'], recreation: ['Recreation & Sports', '/things-to-do/recreation-sports/'], arts: ['Museums', '/things-to-do/museums/'] };
const SCHEMA: Record<string, string> = { hotel: 'Hotel', restaurant: 'Restaurant', nightlife: 'BarOrPub', park: 'Park', trail: 'TouristAttraction', attraction: 'TouristAttraction', arts: 'TouristAttraction', golf: 'GolfCourse', shopping: 'Store', venue: 'EventVenue' };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = await getListing(Number((await params).id)); if (!l) return {};
  return { title: { absolute: l.seoTitle ?? `${l.name} | Visit Chandler` }, description: l.seoDescription ?? excerpt(l.descriptionHtml, 160), alternates: { canonical: listingHref(l) }, openGraph: { images: l.image?.url ? [l.image.url] : undefined } };
}

export default async function ListingPage({ params }: P) {
  const { slug, id } = await params;
  const l = await getListing(Number(id));
  if (!l) { await followRedirect('visit', `/listing/${slug}/${id}/`); notFound(); }
  if (decodeURIComponent(slug) !== l.slug) permanentRedirect(listingHref(l));
  const [secLabel, secHref] = SECTION[l.type] ?? ['Things To Do', '/things-to-do/'];
  const nearby = l.latitude && l.longitude ? await nearbyListings(l.latitude, l.longitude, l.id, 4) : [];
  const images = l.gallery.length ? l.gallery : l.image ? [{ url: l.image.url, alt: l.image.alt, width: l.image.width, height: l.image.height, credit: l.image.credit }] : [];
  const address = [l.address, [l.city, l.state].filter(Boolean).join(', '), l.zip].filter(Boolean).join(' ');
  const directions = l.latitude ? `https://www.google.com/maps/dir/?api=1&destination=${l.latitude},${l.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.name + ' ' + address)}`;
  return (
    <article>
      <TrackView site="visit" name="listing_view" entity="listing" id={l.id} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': SCHEMA[l.type] ?? 'LocalBusiness', name: l.name, description: excerpt(l.descriptionHtml, 300), url: listingHref(l), telephone: l.phone ?? undefined, image: l.image?.url ?? undefined,
        address: l.address ? { '@type': 'PostalAddress', streetAddress: l.address, addressLocality: l.city, addressRegion: 'AZ', postalCode: l.zip ?? undefined } : undefined,
        geo: l.latitude ? { '@type': 'GeoCoordinates', latitude: l.latitude, longitude: l.longitude } : undefined, sameAs: l.website ? [l.website] : undefined }} />
      <div className="mx-auto max-w-[1440px] px-5 pt-28 sm:px-8 sm:pt-32">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: secLabel, href: secHref }, { label: l.name, href: listingHref(l) }]} />
        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            {l.subcategory && <p className="eyebrow text-teal-700">{l.subcategory}{l.region && <span className="text-ink-soft"> · {l.region}</span>}</p>}
            <h1 className="mt-3 max-w-4xl font-display text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.92] text-navy">{l.name}</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <SaveButton variant="pill" item={{ kind: 'listing', id: l.id, name: l.name, href: listingHref(l), image: l.image?.url, lat: l.latitude, lng: l.longitude, category: l.subcategory }} />
            {(l.bookingUrl || (l.type === 'hotel' && l.website)) && <OutboundLink href={(l.bookingUrl || l.website)!} event="booking_click" id={l.id} className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-3 text-sm font-bold text-white hover:bg-navy">{l.type === 'hotel' ? 'Check availability' : 'Book'}<ExternalLink className="size-4" aria-hidden /></OutboundLink>}
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-[1440px] px-5 sm:px-8"><Gallery images={images.map((g) => ({ src: g.url, alt: g.alt || l.name, credit: g.credit, blur: blurFor(g.url) }))} /></div>
      <div className="mx-auto grid max-w-[1440px] gap-14 px-5 py-16 sm:px-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 className="font-display text-4xl text-navy">About</h2>
          <div className="prose-vc mt-6" dangerouslySetInnerHTML={{ __html: sanitizeHtml(l.descriptionHtml) || '<p>Contact this business for more information.</p>' }} />
          {l.amenities.length > 0 && (<><h2 className="mt-14 font-display text-4xl text-navy">Amenities & features</h2>
            <ul className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">{l.amenities.map((a) => <li key={a} className="flex items-start gap-2.5 text-ink-soft"><Check className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden />{a}</li>)}</ul></>)}
          <p className="mt-12 rounded-xl bg-mist px-4 py-3 text-xs text-ink-soft">Information is provided by the business and the Visit Chandler partner database. Hours, prices and availability can change — please confirm directly with the business.</p>
        </div>
        <aside className="lg:col-span-5">
          <div className="sticky top-28 overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-line">
            {l.latitude && l.longitude && <MiniMap lat={l.latitude} lng={l.longitude} label={l.name} />}
            <div className="space-y-5 p-7">
              {address && <div className="flex gap-3"><MapPin className="mt-0.5 size-5 shrink-0 text-teal-600" aria-hidden /><div><span className="sr-only">Address</span><div className="text-navy">{address}</div><a href={directions} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-blue-500"><Navigation className="size-3.5" aria-hidden />Get directions<span className="sr-only"> (opens in new tab)</span></a></div></div>}
              {l.phone && <div className="flex gap-3"><Phone className="size-5 text-teal-600" aria-hidden /><span className="sr-only">Phone</span><div><a href={`tel:${l.phone.replace(/[^\d+]/g, '')}`} className="text-navy hover:underline">{l.phone}</a></div></div>}
              {l.website && <div className="flex gap-3"><Globe className="size-5 text-teal-600" aria-hidden /><span className="sr-only">Website</span><div className="min-w-0"><OutboundLink href={l.website} event="website_click" id={l.id} className="block truncate text-navy hover:underline">{l.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</OutboundLink></div></div>}
              {l.email && <div className="flex gap-3"><Mail className="size-5 text-teal-600" aria-hidden /><span className="sr-only">Email</span><div><a href={`mailto:${l.email}`} className="text-navy hover:underline">{l.email}</a></div></div>}
              {l.social.length > 0 && <div><span className="text-sm font-bold text-navy">Follow</span><div className="mt-2 flex flex-wrap gap-2">{l.social.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noopener" className="rounded-full bg-mist px-3 py-1.5 text-xs font-semibold capitalize">{s.service}</a>)}</div></div>}
            </div>
          </div>
        </aside>
      </div>
      {nearby.length > 0 && (
        <section className="bg-mist py-20" aria-labelledby="nearby"><div className="mx-auto max-w-[1440px] px-5 sm:px-8">
          <h2 id="nearby" className="font-display text-5xl text-navy">Nearby</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{nearby.map((n) => <ListingCardView key={n.id} l={n} />)}</div>
          <Link href={secHref} className="mt-10 inline-block rounded-full px-6 py-3 text-sm font-bold text-navy ring-1 ring-navy/20 hover:bg-navy hover:text-white">More {secLabel.toLowerCase()}</Link>
        </div></section>
      )}
    </article>
  );
}
