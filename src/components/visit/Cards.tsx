import Link from 'next/link';
import { MapPin, CalendarDays, ArrowUpRight, Clock } from 'lucide-react';
import { Img } from '@/components/shared/Img';
import { SaveButton } from './SaveButton';
import type { ListingCard as LC, EventCard as EC } from '@/lib/content';

export const listingHref = (l: { id: number; slug: string }) => `/listing/${l.slug}/${l.id}/`;
export const eventHref = (e: { id: number; slug: string }) => `/event/${e.slug}/${e.id}/`;
export const articleHref = (a: { slug: string }) => `/blog/post/${a.slug}/`;

export function fmtDateRange(start: string | null, end: string | null) {
  if (!start) return null;
  const f = (d: string, o: Intl.DateTimeFormatOptions) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { timeZone: 'America/Phoenix', ...o });
  if (!end || end === start) return f(start, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return `${f(start, { month: 'short', day: 'numeric' })} – ${sameMonth ? f(end, { day: 'numeric' }) : f(end, { month: 'short', day: 'numeric' })}, ${end.slice(0, 4)}`;
}

export function ListingCardView({ l, priority, size = 'md' }: { l: LC; priority?: boolean; size?: 'md' | 'lg' }) {
  return (
    <article className="group relative">
      <Link href={listingHref(l)} className="block focus-visible:outline-none">
        <div className={`relative overflow-hidden rounded-[var(--radius-card)] bg-mist ${size === 'lg' ? 'aspect-[4/5]' : 'aspect-[4/3]'}`}>
          <Img src={l.image} alt={l.imageAlt || l.name} fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw" priority={priority}
            className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/50 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          {l.subcategory && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-navy backdrop-blur">{l.subcategory}</span>}
          <span className="absolute bottom-3 right-3 grid size-10 translate-y-3 place-items-center rounded-full bg-teal-400 text-navy opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100"><ArrowUpRight className="size-5" aria-hidden /></span>
        </div>
        <h3 className="mt-4 text-lg font-bold leading-snug text-navy decoration-teal-400 decoration-2 underline-offset-4 group-hover:underline">{l.name}</h3>
        {(l.region || l.address) && <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft"><MapPin className="size-3.5 shrink-0 text-teal-600" aria-hidden />{l.region || l.address}</p>}
      </Link>
      <div className="absolute right-3 top-3"><SaveButton item={{ kind: 'listing', id: l.id, name: l.name, href: listingHref(l), image: l.image, lat: l.latitude, lng: l.longitude, category: l.subcategory }} /></div>
    </article>
  );
}

export function EventCardView({ e, layout = 'card' }: { e: EC; layout?: 'card' | 'row' }) {
  const date = fmtDateRange(e.startDate, e.endDate);
  const d = e.startDate ? new Date(e.startDate + 'T12:00:00') : null;
  if (layout === 'row') return (
    <article className="group relative grid grid-cols-[88px_1fr] gap-5 border-b border-line py-6 sm:grid-cols-[110px_1fr_200px]">
      <div className="rounded-2xl bg-mist p-3 text-center">
        {d ? <><p className="eyebrow text-teal-700">{d.toLocaleDateString('en-US', { month: 'short' })}</p><p className="font-display text-5xl leading-none text-navy">{d.getDate()}</p><p className="text-xs text-ink-soft">{d.toLocaleDateString('en-US', { weekday: 'short' })}</p></> : <p className="text-xs font-bold text-ink-soft">{e.recurrenceText ?? 'Ongoing'}</p>}
      </div>
      <div>
        <Link href={eventHref(e)} className="text-xl font-bold text-navy after:absolute after:inset-0 group-hover:underline decoration-teal-400 underline-offset-4">{e.title}</Link>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
          {date && <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 text-teal-600" aria-hidden />{date}</span>}
          {e.timesText && <span className="inline-flex items-center gap-1.5"><Clock className="size-4 text-teal-600" aria-hidden />{e.timesText}</span>}
          {e.locationName && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-teal-600" aria-hidden />{e.locationName}</span>}
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">{e.categories.slice(0, 3).map((c) => <li key={c} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">{c}</li>)}</ul>
      </div>
      <div className="relative hidden aspect-[4/3] overflow-hidden rounded-2xl sm:block"><Img src={e.image} alt={e.imageAlt || ''} fill sizes="200px" className="object-cover transition duration-700 group-hover:scale-105" /></div>
    </article>
  );
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-line transition-shadow duration-500 hover:shadow-[0_30px_60px_-30px_rgba(23,43,77,0.35)]">
      <div className="relative aspect-[16/11] overflow-hidden">
        <Img src={e.image} alt={e.imageAlt || ''} fill sizes="(min-width: 1024px) 33vw, 90vw" className="object-cover transition duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-105" />
        {d && <div className="absolute left-4 top-4 rounded-2xl bg-white px-3 py-2 text-center shadow-lg"><p className="eyebrow text-[10px] text-teal-700">{d.toLocaleDateString('en-US', { month: 'short' })}</p><p className="font-display text-3xl leading-none text-navy">{d.getDate()}</p></div>}
        <div className="absolute right-3 top-3"><SaveButton item={{ kind: 'event', id: e.id, name: e.title, href: eventHref(e), image: e.image, lat: e.latitude, lng: e.longitude, category: e.categories[0] }} /></div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        {e.categories[0] && <p className="eyebrow text-teal-700">{e.categories[0]}</p>}
        <h3 className="mt-2 text-xl font-bold leading-snug text-navy"><Link href={eventHref(e)} className="after:absolute after:inset-0">{e.title}</Link></h3>
        <p className="mt-auto pt-4 text-sm text-ink-soft">{date ?? e.recurrenceText}{e.locationName && <> · {e.locationName}</>}</p>
      </div>
    </article>
  );
}

export function StoryCard({ a, feature }: { a: { slug: string; title: string; excerpt: string | null; image: string | null; imageAlt: string | null; publishedOn: string | null; categories: string[] }; feature?: boolean }) {
  return (
    <article className="group relative">
      <div className={`relative overflow-hidden rounded-[var(--radius-card)] ${feature ? 'aspect-[16/10]' : 'aspect-[3/2]'}`}>
        <Img src={a.image} alt={a.imageAlt || ''} fill sizes={feature ? '(min-width:1024px) 50vw, 100vw' : '(min-width:1024px) 25vw, 100vw'} className="object-cover transition duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-105" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">{a.categories[0] ?? 'Story'}{a.publishedOn && <span className="text-ink-soft"> · {new Date(a.publishedOn + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}</p>
      <h3 className={`mt-2 font-display leading-[1.05] text-navy ${feature ? 'text-4xl' : 'text-2xl'}`}><Link href={articleHref(a)} className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 after:absolute after:inset-0 group-hover:bg-[length:100%_1px]">{a.title}</Link></h3>
      {feature && a.excerpt && <p className="mt-3 line-clamp-3 text-ink-soft">{a.excerpt}</p>}
    </article>
  );
}

export function SectionHeading({ eyebrow, title, intro, href, cta, align = 'split', tone = 'light' }: { eyebrow?: string; title: React.ReactNode; intro?: string; href?: string; cta?: string; align?: 'split' | 'center'; tone?: 'light' | 'dark' }) {
  return (
    <div className={`flex flex-col gap-6 ${align === 'center' ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'}`} data-reveal>
      <div className="max-w-3xl">
        {eyebrow && <p className={`eyebrow ${tone === 'dark' ? 'text-teal-300' : 'text-teal-700'}`}>{eyebrow}</p>}
        <h2 className={`mt-3 font-display text-[clamp(2.6rem,5.5vw,4.75rem)] leading-[0.95] tracking-[-0.01em] ${tone === 'dark' ? 'text-white' : 'text-navy'}`}>{title}</h2>
        {intro && <p className={`mt-5 max-w-2xl text-lg leading-relaxed ${tone === 'dark' ? 'text-white/70' : 'text-ink-soft'}`}>{intro}</p>}
      </div>
      {href && <Link href={href} className={`group inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold ring-1 transition ${tone === 'dark' ? 'text-white ring-white/30 hover:bg-white hover:text-navy' : 'text-navy ring-navy/15 hover:bg-navy hover:text-white'}`}>{cta ?? 'View all'}<ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden /></Link>}
    </div>
  );
}
