import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Img } from '@/components/shared/Img';
import { JsonLd } from '@/components/shared/JsonLd';

export type Crumb = { label: string; href: string };

export function Breadcrumbs({ items, tone = 'light' }: { items: Crumb[]; tone?: 'light' | 'dark' }) {
  const base = process.env.VISIT_SITE_URL ?? 'https://www.visitchandler.com';
  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className={`flex flex-wrap items-center gap-1 text-sm ${tone === 'dark' ? 'text-white/75' : 'text-ink-soft'}`}>
          {items.map((c, i) => (
            <li key={c.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5 opacity-60" aria-hidden />}
              {i === items.length - 1 ? <span aria-current="page" className="font-semibold">{c.label}</span> : <Link href={c.href} className="hover:underline">{c.label}</Link>}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, item: base + c.href })) }} />
    </>
  );
}

/** Editorial page hero. With an image: immersive full-bleed; without: typographic hero on mist. */
export function PageHero({ title, eyebrow, intro, image, alt, crumbs, children, size = 'lg' }: { title: string; eyebrow?: string; intro?: string | null; image?: string | null; alt?: string | null; crumbs: Crumb[]; children?: React.ReactNode; size?: 'lg' | 'md' }) {
  if (!image) return (
    <section className="relative overflow-hidden bg-mist pb-16 pt-36 sm:pt-44">
      <div aria-hidden className="absolute -right-32 -top-32 size-[480px] rounded-full bg-teal-100 blur-3xl" />
      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8">
        <Breadcrumbs items={crumbs} />
        {eyebrow && <p className="eyebrow mt-8 text-teal-700">{eyebrow}</p>}
        <h1 className="split-words mt-4 max-w-5xl font-display text-[clamp(3rem,7vw,6.5rem)] leading-[0.92] text-navy">{title.split(' ').map((w, i) => <span key={i} style={{ '--i': i } as React.CSSProperties}>{w}&nbsp;</span>)}</h1>
        {intro && <p className="mt-6 max-w-2xl text-lg text-ink-soft" style={{ animation: 'rise .9s var(--ease-out-expo) .5s both' }}>{intro}</p>}
        {children}
      </div>
    </section>
  );
  return (
    <section className={`relative isolate flex flex-col justify-end overflow-hidden bg-navy-950 text-white ${size === 'lg' ? 'min-h-[78svh]' : 'min-h-[60svh]'}`}>
      <div className="absolute inset-0 -z-10 overflow-hidden"><div className="absolute inset-0" style={{ animation: 'kenburns 14s ease-out both' }}><Img src={image} alt={alt ?? ''} fill priority sizes="100vw" className="object-cover" /></div></div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(13,26,48,.6)_0%,rgba(13,26,48,.1)_35%,rgba(13,26,48,.85)_100%)]" />
      <div className="mx-auto w-full max-w-[1440px] px-5 pb-14 pt-40 sm:px-8 sm:pb-20">
        <Breadcrumbs items={crumbs} tone="dark" />
        {eyebrow && <p className="eyebrow mt-8 text-teal-300">{eyebrow}</p>}
        <h1 className="split-words mt-4 max-w-5xl font-display text-[clamp(3rem,7.5vw,7rem)] leading-[0.9]">{title.split(' ').map((w, i) => <span key={i} style={{ '--i': i } as React.CSSProperties}>{w}&nbsp;</span>)}</h1>
        {intro && <p className="mt-6 max-w-2xl text-lg text-white/80" style={{ animation: 'rise .9s var(--ease-out-expo) .5s both' }}>{intro}</p>}
        {children}
      </div>
    </section>
  );
}

export function crumbsFor(path: string, title: string, lookup: (p: string) => string | undefined): Crumb[] {
  const parts = path.split('/').filter(Boolean);
  const out: Crumb[] = [{ label: 'Home', href: '/' }];
  let acc = '/';
  parts.forEach((p, i) => {
    acc += p + '/';
    out.push({ label: i === parts.length - 1 ? title : lookup(acc) ?? p.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), href: acc });
  });
  return out;
}
