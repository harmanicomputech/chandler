import Link from 'next/link';
import { Img } from '@/components/shared/Img';
import { JsonLd } from '@/components/shared/JsonLd';
export function EdoHero({ title, summary, image, crumbs, eyebrow }: { title: string; summary?: string | null; image?: string | null; crumbs: { label: string; href: string }[]; eyebrow?: string }) {
  return (
    <section className="edo-grid-bg relative isolate overflow-hidden bg-edo-ink text-white">
      {image && <div className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 lg:block"><Img src={image} alt="" fill priority sizes="50vw" className="object-cover opacity-60" /><div className="absolute inset-0 bg-gradient-to-r from-edo-ink via-edo-ink/60 to-transparent" /></div>}
      <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-12 sm:px-8 lg:pb-24">
        <nav aria-label="Breadcrumb"><ol className="flex flex-wrap gap-1.5 font-mono text-[11px] uppercase tracking-wider text-white/55">{crumbs.map((c, i) => <li key={c.href} className="flex gap-1.5">{i > 0 && <span aria-hidden>/</span>}{i === crumbs.length - 1 ? <span aria-current="page" className="text-white/85">{c.label}</span> : <Link href={c.href} className="hover:text-white">{c.label}</Link>}</li>)}</ol></nav>
        {eyebrow && <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-edo-gold">{eyebrow}</p>}
        <h1 className="split-words mt-6 max-w-4xl font-[family-name:var(--font-edo-display)] text-[clamp(2.4rem,5.5vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.025em]">{title.split(' ').map((w, i) => <span key={i} style={{ '--i': i } as React.CSSProperties}>{w}&nbsp;</span>)}</h1>
        {summary && <p className="mt-6 max-w-2xl text-lg text-white/70">{summary}</p>}
      </div>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, item: c.href })) }} />
    </section>
  );
}
