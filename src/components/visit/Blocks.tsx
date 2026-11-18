import Link from 'next/link';
import { ArrowUpRight, Download } from 'lucide-react';
import { Img } from '@/components/shared/Img';
import { SmartForm } from '@/components/shared/SmartForm';
import { FORMS } from '@/lib/forms';

type Tile = { title: string; href: string; image: string | null; alt?: string };
const isExternal = (h: string) => /^https?:\/\//.test(h);

/** Renders CMS blocks migrated from legacy Simpleview widgets (tiles, embeds, galleries, forms). */
export function Blocks({ blocks, site = 'visit' }: { blocks: any[]; site?: 'visit' | 'edo' }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === 'tiles') return <TileBlock key={i} heading={b.heading} items={b.items} template={b.template} />;
        if (b.type === 'embeds') return (
          <div key={i} className="mx-auto grid max-w-[1100px] gap-8 px-5 py-10 sm:px-8">
            {b.items.filter((u: string) => /youtube|storymaps|ecdev|issuu|google\.com\/maps/.test(u)).map((u: string) => {
              const src = u.replace('www.youtube.com/embed', 'www.youtube-nocookie.com/embed').replace(/autoplay=1/, 'autoplay=0');
              return <div key={u} className="relative aspect-video overflow-hidden rounded-[var(--radius-card)] bg-mist ring-1 ring-line"><iframe src={src} title={/youtube/.test(u) ? 'Video' : /storymaps/.test(u) ? 'Interactive story map' : /issuu/.test(u) ? 'Publication viewer' : 'Embedded content'} loading="lazy" className="absolute inset-0 size-full" allowFullScreen /></div>;
            })}
          </div>
        );
        if (b.type === 'gallery') return (
          <div key={i} className="mx-auto max-w-[1440px] columns-1 gap-4 px-5 py-10 sm:columns-2 sm:px-8 lg:columns-3">
            {b.images.map((g: { src: string; alt: string }) => (
              <figure key={g.src} className="mb-4 break-inside-avoid overflow-hidden rounded-2xl" data-reveal>
                <Img src={g.src} alt={g.alt} width={800} height={600} sizes="(min-width:1024px) 33vw, 100vw" className="h-auto w-full" />
                <figcaption className="flex items-center justify-between gap-3 bg-mist px-4 py-3 text-sm text-ink-soft">{g.alt || 'Chandler photography'}<a href={g.src} download className="inline-flex items-center gap-1 font-semibold text-blue-500"><Download className="size-4" aria-hidden />Download</a></figcaption>
              </figure>
            ))}
          </div>
        );
        if (b.type === 'form' && FORMS[b.form]) return (
          <div key={i} className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8">
            <div className="grid gap-10 rounded-[2rem] bg-mist p-6 sm:p-12 lg:grid-cols-12">
              <div className="lg:col-span-4"><p className="eyebrow text-teal-700">Get in touch</p><h2 className="mt-3 font-display text-5xl leading-none text-navy">{FORMS[b.form].title}</h2><p className="mt-5 text-ink-soft">{FORMS[b.form].intro}</p></div>
              <div className="lg:col-span-8"><SmartForm formKey={b.form} spec={FORMS[b.form]} theme={site} compact /></div>
            </div>
          </div>
        );
        return null;
      })}
    </>
  );
}

function TileBlock({ heading, items, template }: { heading?: string; items: Tile[]; template: string }) {
  const withImg = items.filter((t) => t.image);
  if (!withImg.length) return (
    <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8">
      {heading && <h2 className="font-display text-4xl text-navy">{heading}</h2>}
      <ul className="mt-6 flex flex-wrap gap-3">{items.map((t) => <li key={t.href}><Link href={t.href} className="inline-flex items-center gap-2 rounded-full bg-mist px-5 py-3 text-sm font-semibold text-navy hover:bg-blue-50">{t.title || t.href}<ArrowUpRight className="size-4" aria-hidden /></Link></li>)}</ul>
    </div>
  );
  const single = withImg.length === 1 || /side_by_side|imagebox/.test(template);
  if (single) return (
    <>{withImg.map((t, i) => (
      <div key={t.href + i} className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8">
        <Link href={t.href} className={`group grid items-center gap-8 overflow-hidden rounded-[var(--radius-card)] bg-mist lg:grid-cols-2 ${i % 2 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
          <div className="relative aspect-[16/11] overflow-hidden"><Img src={t.image} alt={t.alt ?? ''} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover transition duration-[1.2s] group-hover:scale-105" /></div>
          <div className="p-8 lg:p-14" data-reveal><h2 className="font-display text-4xl leading-[1] text-navy sm:text-5xl">{(i === 0 && heading) || t.title}</h2><span className="mt-8 inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-bold text-white transition group-hover:bg-blue-500">{isExternal(t.href) ? 'Visit website' : 'Explore'}<ArrowUpRight className="size-4" aria-hidden /></span></div>
        </Link>
      </div>
    ))}</>
  );
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8">
      {heading && <h2 className="font-display text-5xl leading-none text-navy" data-reveal>{heading}</h2>}
      <ul className={`mt-8 grid gap-6 sm:grid-cols-2 ${withImg.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {withImg.map((t, i) => (
          <li key={t.href + i} data-reveal style={{ '--reveal-delay': `${(i % 4) * 60}ms` } as React.CSSProperties}>
            <Link href={t.href} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)]"><Img src={t.image} alt={t.alt ?? ''} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-105" /></div>
              <p className="mt-4 text-lg font-bold leading-snug text-navy group-hover:underline decoration-teal-400 underline-offset-4">{t.title}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
