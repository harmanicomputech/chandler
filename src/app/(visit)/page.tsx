import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, ArrowUpRight, MapPinned, Sparkles, Route, Building2, Sun } from 'lucide-react';
import { getPage, queryEvents, queryListings, queryArticles } from '@/lib/content';
import { Img } from '@/components/shared/Img';
import { HeroSlides } from '@/components/visit/HeroSlides';
import { HeroDiscover } from '@/components/visit/HeroDiscover';
import { WeatherBadge, WeatherCard } from '@/components/visit/WeatherBadge';
import { ListingCardView, EventCardView, StoryCard, SectionHeading, eventHref } from '@/components/visit/Cards';
import { NewsletterForm } from '@/components/visit/NewsletterForm';
import { HomeMap } from '@/components/visit/HomeMap';
import { sanitizeHtml } from '@/lib/sanitize';
import { JsonLd } from '@/components/shared/JsonLd';
import { blurFor } from '@/lib/blur';

export const revalidate = 300;

type Block = Record<string, any> & { key: string };

export async function generateMetadata(): Promise<Metadata> {
  const p = await getPage('visit', '/');
  return {
    title: { absolute: p?.seoTitle ?? 'Visit Chandler, AZ | Things to Do, Restaurants, Hotels & Events' },
    description: p?.seoDescription ?? undefined,
    alternates: { canonical: '/' },
    openGraph: { images: p?.ogImage ? [p.ogImage] : undefined, type: 'website', siteName: 'Visit Chandler' },
  };
}

export default async function Home() {
  const page = await getPage('visit', '/');
  const blocks = (page?.blocks ?? []) as Block[];
  const b = (k: string) => blocks.find((x) => x.key === k);
  const hero = b('hero'); const intro = b('intro'); const spotlight = b('spotlight'); const gateways = b('gateways');
  const hike = b('hike'); const guide = b('guide'); const highlights = b('highlights');

  const [events, hotels, dining, stories, outdoors, counts] = await Promise.all([
    queryEvents({ limit: 6 }),
    queryListings({ type: 'hotel', limit: 4, withImage: true }),
    queryListings({ type: 'restaurant', limit: 8, withImage: true, sort: 'recent' }),
    queryArticles({ limit: 5 }),
    queryListings({ type: ['trail', 'park'], subcategory: ['Hiking/Walking', 'Parks'], limit: 4 }),
    Promise.all([queryListings({ type: 'restaurant', limit: 1 }), queryListings({ type: 'hotel', limit: 1 })]),
  ]);
  // Facts: verified copy from the CMS block + live counts from the directory (never hard-coded claims).
  const facts = [
    ...((intro?.facts ?? []) as { value: string; label: string; count?: number; suffix?: string }[]),
    { value: String(counts[0].total), count: counts[0].total, label: 'restaurants listed' },
    { value: String(counts[1].total), count: counts[1].total, label: 'places to stay' },
  ].slice(0, 3);
  const headline: string = hero?.headline ?? 'Where city meets desert.';

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'TouristDestination', name: 'Chandler, Arizona', url: process.env.VISIT_SITE_URL ?? 'https://www.visitchandler.com/', description: page?.seoDescription, geo: { '@type': 'GeoCoordinates', latitude: 33.3062, longitude: -111.8413 } }} />

      {/* ───────── HERO ───────── */}
      <section aria-labelledby="hero-title" className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-navy-950 text-white">
        {hero?.slides?.length ? <HeroSlides slides={hero.slides.map((x: { src: string }) => ({ ...x, blur: blurFor(x.src) }))} /> : null}
        <div aria-hidden className="absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(13,26,48,.55)_0%,rgba(13,26,48,0)_28%,rgba(13,26,48,.15)_55%,rgba(13,26,48,.85)_100%)]" />
        <div aria-hidden className="grain absolute inset-0 z-10" />
        <div className="relative z-20 mx-auto w-full max-w-[1440px] px-5 pb-28 pt-40 sm:px-8 lg:pb-32">
          <p className="eyebrow text-teal-200" style={{ animation: 'rise .9s var(--ease-out-expo) .1s both' }}>Chandler, Arizona · Greater Phoenix</p>
          <h1 id="hero-title" className="split-words mt-5 max-w-5xl font-display text-[clamp(3.6rem,11vw,10.5rem)] leading-[0.86] tracking-[-0.02em]">
            {headline.split(' ').map((w, i) => (
              <span key={i} style={{ '--i': i } as React.CSSProperties} className={/desert/i.test(w) ? 'italic text-teal-300' : ''}>{w}&nbsp;</span>
            ))}
          </h1>
          <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <HeroDiscover />
            <div style={{ animation: 'rise 1s var(--ease-out-expo) 1.1s both' }}><WeatherBadge /></div>
          </div>
        </div>
      </section>

      {/* ───────── INTRO (verified copy from the current homepage) ───────── */}
      {intro && (
        <section className="relative overflow-hidden bg-white py-24 sm:py-32">
          <div aria-hidden className="absolute -left-40 top-20 size-[520px] rounded-full bg-teal-50 blur-3xl" />
          <div className="relative mx-auto grid max-w-[1440px] gap-14 px-5 sm:px-8 lg:grid-cols-12 lg:gap-20">
            <div className="lg:col-span-6 lg:pt-10" data-reveal>
              <p className="eyebrow text-teal-700">{intro.eyebrow ?? 'Visit Chandler'}</p>
              <h2 className="mt-4 font-display text-[clamp(2.6rem,5vw,4.5rem)] leading-[0.95] text-navy">{intro.title}</h2>
              <div className="prose-vc mt-8 max-w-xl" dangerouslySetInnerHTML={{ __html: sanitizeHtml(intro.html) }} />
              <div className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-8">
                {facts.map((f) => (
                  <div key={f.label}><p className="font-display text-5xl text-blue-500" data-count={f.count} data-suffix={f.suffix}>{f.value}</p><p className="mt-1 text-sm text-ink-soft">{f.label}</p></div>
                ))}
              </div>
            </div>
            <div className="relative lg:col-span-6">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)]" data-reveal="mask">
                <div className="absolute inset-[-8%]" data-parallax="0.08"><Img src={intro.image} alt={intro.imageAlt ?? ''} fill sizes="(min-width:1024px) 45vw, 100vw" className="object-cover" /></div>
              </div>
              {intro.image2 && (
                <div className="absolute -bottom-12 -left-6 hidden w-[46%] overflow-hidden rounded-[var(--radius-card)] border-[10px] border-white shadow-2xl sm:block lg:-left-16" data-reveal style={{ '--reveal-delay': '200ms' } as React.CSSProperties}>
                  <div className="relative aspect-square"><Img src={intro.image2} alt={intro.image2Alt ?? ''} fill sizes="25vw" className="object-cover" /></div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ───────── GATEWAYS (6 callout tiles from the current homepage) ───────── */}
      {gateways && (
        <section aria-labelledby="explore-title" className="bg-mist py-24 sm:py-28">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
            <SectionHeading eyebrow="Start exploring" title={<span id="explore-title">So many ways <em className="text-blue-500">to Chandler</em></span>} />
            <ul className="mt-14 grid auto-rows-[260px] grid-cols-1 gap-4 sm:grid-cols-2 lg:auto-rows-[280px] lg:grid-cols-4">
              {gateways.items.map((g: { label: string; href: string; image: string; alt: string }, i: number) => (
                <li key={g.href} data-reveal style={{ '--reveal-delay': `${i * 70}ms` } as React.CSSProperties}
                  className={i === 0 ? 'sm:col-span-2 lg:row-span-2' : i >= 3 ? 'lg:col-span-2' : ''}>
                  <Link href={g.href} className="group relative block h-full overflow-hidden rounded-[var(--radius-card)]">
                    <Img src={g.image} alt={g.alt} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover:scale-[1.07]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/10 to-transparent transition-opacity duration-500 group-hover:from-blue-600/85" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-white sm:p-8">
                      <p className={`font-display leading-none ${i === 0 ? 'text-5xl sm:text-6xl' : 'text-4xl'}`}>{g.label}</p>
                      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur transition-all duration-500 group-hover:rotate-45 group-hover:bg-teal-400 group-hover:text-navy"><ArrowUpRight className="size-5" aria-hidden /></span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ───────── SPOTLIGHT (featured event from current homepage) ───────── */}
      {spotlight && (
        <section className="relative isolate overflow-hidden bg-navy-950 text-white">
          <div className="absolute inset-0 -z-10 overflow-hidden"><div className="absolute inset-[-10%]" data-parallax="0.12"><Img src={spotlight.image} alt="" fill sizes="100vw" className="object-cover opacity-60" /></div></div>
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950 via-navy-950/70 to-transparent" />
          <div className="mx-auto grid min-h-[78vh] max-w-[1440px] items-center gap-10 px-5 py-24 sm:px-8 lg:grid-cols-12">
            <div className="lg:col-span-6" data-reveal>
              <p className="inline-flex items-center gap-2 rounded-full bg-teal-400 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-navy"><Sparkles className="size-3.5" aria-hidden />{spotlight.eyebrow}</p>
              <h2 className="mt-6 font-display text-[clamp(3rem,7vw,6.5rem)] leading-[0.9]">{spotlight.title}</h2>
              {spotlight.text && <p className="mt-6 max-w-lg text-lg text-white/75">{spotlight.text}</p>}
              <Link href={spotlight.href} className="group mt-10 inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 font-bold text-navy transition hover:gap-5 hover:bg-teal-300">Event details <ArrowRight className="size-5" aria-hidden /></Link>
            </div>
          </div>
        </section>
      )}

      {/* ───────── EVENTS ───────── */}
      <section aria-labelledby="events-title" className="py-24 sm:py-32">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
          <SectionHeading eyebrow="What's on" title={<span id="events-title">Upcoming <em className="text-blue-500">events</em></span>} intro="Festivals, live music, markets and family days out — straight from the Chandler events calendar." href="/events/" cta="Full calendar" />
          {events.rows.length ? (
            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.rows.slice(0, 3).map((e, i) => <div key={e.id} data-reveal style={{ '--reveal-delay': `${i * 90}ms` } as React.CSSProperties}><EventCardView e={e} /></div>)}
            </div>
          ) : <p className="mt-10 text-ink-soft">No upcoming events are published right now. <Link className="underline" href="/events/submit-your-event/">Submit an event</Link>.</p>}
          {events.rows.length > 3 && (
            <ul className="mt-10 divide-y divide-line border-y border-line">
              {events.rows.slice(3, 6).map((e) => (
                <li key={e.id}><Link href={eventHref(e)} className="group flex items-center justify-between gap-6 py-5 transition-colors hover:text-blue-500">
                  <span className="text-lg font-bold">{e.title}</span>
                  <span className="hidden shrink-0 text-sm text-ink-soft sm:block">{e.startDate ? new Date(e.startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : e.recurrenceText}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ───────── STAY ───────── */}
      <section aria-labelledby="stay-title" className="bg-mist py-24 sm:py-32">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
          <SectionHeading eyebrow="Places to stay" title={<span id="stay-title">Rest easy, <em className="text-blue-500">resort-style</em></span>} intro="From golf resorts to downtown boutique stays, find the right base for your Chandler trip." href="/hotels/" cta="All hotels" />
          <div className="mt-14 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {hotels.rows.map((l, i) => <div key={l.id} data-reveal style={{ '--reveal-delay': `${i * 80}ms` } as React.CSSProperties}><ListingCardView l={l} size="lg" /></div>)}
          </div>
        </div>
      </section>

      {/* ───────── DINE (horizontal scroller) ───────── */}
      <section aria-labelledby="dine-title" className="overflow-hidden py-24 sm:py-32">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
          <SectionHeading eyebrow="Eat & drink" title={<span id="dine-title">A table for <em className="text-blue-500">every craving</em></span>} intro="Whether your taste buds cry out for Italian, Asian, pub grub, or a premium steakhouse, you’ll find it here." href="/restaurants/" cta="All restaurants" />
        </div>
        <div className="mt-14 flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-6 [scrollbar-width:thin] sm:px-8 lg:px-[max(2rem,calc((100vw_-_1440px)/2_+_2rem))]" tabIndex={0} aria-label="Featured restaurants, scroll horizontally">
          {dining.rows.map((l) => <div key={l.id} className="w-[78vw] shrink-0 snap-start sm:w-[340px]"><ListingCardView l={l} /></div>)}
          <Link href="/restaurants/" className="grid w-[260px] shrink-0 snap-start place-items-center rounded-[var(--radius-card)] bg-blue-500 p-8 text-center text-white transition hover:bg-navy">
            <span><span className="font-display text-4xl leading-none">See every restaurant</span><ArrowRight className="mx-auto mt-6 size-8" aria-hidden /></span>
          </Link>
        </div>
      </section>

      {/* ───────── OUTDOORS split ───────── */}
      {hike && (
        <section className="relative bg-navy-950 py-24 text-white sm:py-32">
          <div className="mx-auto grid max-w-[1440px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-2">
            <div className="relative aspect-[5/4] overflow-hidden rounded-[var(--radius-card)]" data-reveal="mask">
              <div className="absolute inset-[-8%]" data-parallax="0.06"><Img src={hike.image} alt={hike.alt ?? ''} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" /></div>
            </div>
            <div data-reveal>
              <p className="eyebrow text-teal-300">Outdoors & wildlife</p>
              <h2 className="mt-4 font-display text-[clamp(2.6rem,5vw,4.75rem)] leading-[0.95]">{hike.title}</h2>
              <p className="mt-6 max-w-lg text-lg text-white/70">{hike.text}</p>
              <ul className="mt-10 space-y-3">
                {outdoors.rows.map((l) => (
                  <li key={l.id}><Link href={`/listing/${l.slug}/${l.id}/`} className="group flex items-center justify-between rounded-2xl bg-white/5 px-5 py-4 ring-1 ring-white/10 transition hover:bg-white/10">
                    <span className="font-semibold">{l.name}</span><ArrowUpRight className="size-5 text-teal-300 transition group-hover:rotate-45" aria-hidden /></Link></li>
                ))}
              </ul>
              <Link href={hike.href} className="mt-10 inline-flex items-center gap-3 rounded-full bg-teal-400 px-7 py-4 font-bold text-navy transition hover:bg-teal-300">Explore the trails <ArrowRight className="size-5" aria-hidden /></Link>
            </div>
          </div>
        </section>
      )}

      {/* ───────── MAP ───────── */}
      <section aria-labelledby="map-title" className="py-24 sm:py-32">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
          <SectionHeading eyebrow="Interactive map" title={<span id="map-title">Find your way <em className="text-blue-500">around town</em></span>} intro="Hotels, restaurants, parks and attractions — plotted, filterable and a tap away from directions." href="/map/" cta="Open full map" />
          <div className="mt-12 overflow-hidden rounded-[var(--radius-card)] ring-1 ring-line" data-reveal><HomeMap /></div>
        </div>
      </section>

      {/* ───────── STORIES ───────── */}
      {stories.rows.length > 0 && (
        <section aria-labelledby="stories-title" className="bg-mist py-24 sm:py-32">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
            <SectionHeading eyebrow="Stories & guides" title={<span id="stories-title">Inspiration from <em className="text-blue-500">the blog</em></span>} href="/blog/" cta="All stories" />
            <div className="mt-14 grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-6" data-reveal><StoryCard a={stories.rows[0]} feature /></div>
              <div className="grid gap-10 sm:grid-cols-2 lg:col-span-6">
                {stories.rows.slice(1, 5).map((a, i) => <div key={a.id} data-reveal style={{ '--reveal-delay': `${i * 80}ms` } as React.CSSProperties}><StoryCard a={a} /></div>)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────── PLAN ───────── */}
      <section aria-labelledby="plan-title" className="py-24 sm:py-32">
        <div className="mx-auto grid max-w-[1440px] gap-6 px-5 sm:px-8 lg:grid-cols-12">
          <div className="lg:col-span-12"><SectionHeading eyebrow="Plan your visit" title={<span id="plan-title">Everything you need, <em className="text-blue-500">before you go</em></span>} /></div>
          <div className="lg:col-span-5" data-reveal><WeatherCard /></div>
          <div className="grid gap-6 sm:grid-cols-2 lg:col-span-7">
            {[
              { icon: Route, title: 'Trip planner', text: 'Save places, build a day-by-day itinerary, then share or print it.', href: '/trip-planner/' },
              { icon: MapPinned, title: 'Getting here', text: 'Airports, transit, parking and getting around Chandler.', href: '/plan-your-visit/chandler-transportation/' },
              { icon: Building2, title: 'Visitor center', text: 'Local advice, maps and brochures in downtown Chandler.', href: '/plan-your-visit/visitor-center/' },
              { icon: Sun, title: 'Ask the concierge', text: 'Questions about your trip? Get answers from official Visit Chandler content.', href: '/concierge/' },
            ].map((c, i) => (
              <Link key={c.href} href={c.href} data-reveal style={{ '--reveal-delay': `${i * 70}ms` } as React.CSSProperties} className="group flex flex-col rounded-[var(--radius-card)] bg-mist p-7 transition duration-500 hover:-translate-y-1 hover:bg-white hover:shadow-[0_30px_60px_-30px_rgba(23,43,77,0.35)] hover:ring-1 hover:ring-line">
                <c.icon className="size-8 text-blue-500" strokeWidth={1.5} aria-hidden />
                <p className="mt-8 text-xl font-bold text-navy">{c.title}</p>
                <p className="mt-2 text-sm text-ink-soft">{c.text}</p>
                <ArrowRight className="mt-6 size-5 text-teal-600 transition-transform group-hover:translate-x-2" aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── VISITORS GUIDE ───────── */}
      {guide && (
        <section className="px-5 pb-24 sm:px-8 sm:pb-32">
          <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[2rem] bg-blue-500 text-white">
            <div className="absolute inset-y-0 right-0 hidden w-1/2 lg:block"><Img src={guide.image} alt={guide.alt ?? ''} fill sizes="50vw" className="object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-transparent" /></div>
            <div className="relative max-w-xl p-10 sm:p-16" data-reveal>
              <p className="eyebrow text-teal-200">Free download</p>
              <h2 className="mt-4 font-display text-6xl leading-[0.95]">{guide.title}</h2>
              <p className="mt-5 text-lg text-white/80">{guide.text}</p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href={guide.href} className="rounded-full bg-white px-7 py-4 font-bold text-navy transition hover:bg-teal-300">Get the guide</Link>
                <Link href="/request-guide/" className="rounded-full px-7 py-4 font-bold ring-1 ring-white/40 transition hover:bg-white/10">Order a printed copy</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────── DISCOVER MORE (highlights from current homepage) ───────── */}
      {highlights && (
        <section aria-labelledby="discover-title" className="border-t border-line py-20">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
            <h2 id="discover-title" className="font-display text-4xl text-navy" data-reveal>{highlights.title}</h2>
            <ul className="mt-8 flex flex-wrap gap-3" data-reveal>
              {highlights.items.map((h: { label: string; href: string }) => (
                <li key={h.href}><Link href={h.href} className="inline-block rounded-full bg-mist px-5 py-3 text-sm font-semibold text-navy ring-1 ring-transparent transition hover:bg-white hover:ring-blue-500">{h.label}</Link></li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ───────── NEWSLETTER ───────── */}
      <section className="bg-teal-50 py-20">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div data-reveal><p className="eyebrow text-teal-700">#VisitChandler</p><h2 className="mt-3 max-w-xl font-display text-5xl leading-[0.95] text-navy">Get the best of Chandler in your inbox.</h2></div>
          <div className="w-full max-w-lg" data-reveal><NewsletterForm /></div>
        </div>
      </section>
    </>
  );
}
