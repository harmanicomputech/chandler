import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getPage, childPages } from '@/lib/content';
import { followRedirect } from '@/lib/redirects';
import { sanitizeHtml } from '@/lib/sanitize';
import { PageHero, crumbsFor } from '@/components/visit/PageHero';
import { Blocks } from '@/components/visit/Blocks';
import { Directory } from '@/components/visit/Directory';
import { EventsBrowser } from '@/components/visit/EventsBrowser';
import { BlogIndex } from '@/components/visit/BlogIndex';
import { WeatherCentre } from '@/components/visit/WeatherCentre';
import { SiteMapIndex } from '@/components/visit/SiteMapIndex';
import { Img } from '@/components/shared/Img';
import { db, schema } from '@/db';
import { and, eq, inArray } from 'drizzle-orm';

type Props = { params: Promise<{ slug: string[] }>; searchParams: Promise<Record<string, string | undefined>> };
const toPath = (slug: string[]) => '/' + slug.map(decodeURIComponent).join('/') + '/';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const path = toPath((await params).slug);
  const p = await getPage('visit', path);
  if (!p) return {};
  return {
    title: { absolute: p.seoTitle ?? `${p.title} | Visit Chandler` }, description: p.seoDescription ?? p.summary ?? undefined,
    alternates: { canonical: p.canonicalUrl ?? path }, robots: p.noindex ? { index: false } : undefined,
    openGraph: { title: p.title, description: p.seoDescription ?? undefined, images: p.ogImage ? [p.ogImage] : p.hero?.url ? [p.hero.url] : undefined },
  };
}

export default async function CmsPage({ params, searchParams }: Props) {
  const path = toPath((await params).slug);
  const sp = await searchParams;
  const page = await getPage('visit', path);
  if (!page) { await followRedirect('visit', path); notFound(); }

  // Breadcrumb labels from real page titles
  const ancestors = path.split('/').filter(Boolean).map((_, i, a) => '/' + a.slice(0, i + 1).join('/') + '/');
  const titles = await db.select({ path: schema.pages.path, title: schema.pages.title }).from(schema.pages).where(and(eq(schema.pages.site, 'visit'), inArray(schema.pages.path, ancestors)));
  const crumbs = crumbsFor(path, page.title, (p) => titles.find((t) => t.path === p)?.title);
  const blocks = (page.blocks ?? []) as any[];
  const dirBlock = blocks.find((b) => b.type === 'directory');
  const kids = ['standard', 'directory'].includes(page.template) ? await childPages('visit', path) : [];
  const body = sanitizeHtml(page.bodyHtml);
  const sectionTitle = page.section && page.section + '/' !== path ? titles.find((t) => t.path === page.section + '/')?.title : undefined;
  const eyebrow = sectionTitle && sectionTitle !== page.title ? sectionTitle : undefined;
  // Long legacy intros: show the first two paragraphs, rest behind "Read more" so directories stay above the fold.
  const parts = body.split(/(?<=<\/p>)/);
  const [lead, more] = parts.length > 4 ? [parts.slice(0, 2).join(''), parts.slice(2).join('')] : [body, ''];

  return (
    <>
      <PageHero title={page.template === 'weather' ? 'Chandler weather' : page.title} eyebrow={eyebrow} intro={page.template === 'directory' ? null : page.summary} image={page.hero?.url} alt={page.hero?.alt} crumbs={crumbs} />
      {page.template === 'weather' ? <WeatherCentre />
        : page.template === 'events' ? <EventsBrowser path={path} sp={sp} weekend={path.includes('this-weekend')} intro={body} />
        : page.template === 'blog-index' ? <BlogIndex sp={sp} />
        : page.template === 'sitemap' ? <SiteMapIndex />
        : (
          <>
            {body && (
              <div className="mx-auto max-w-[1440px] px-5 pt-16 sm:px-8 sm:pt-24">
                <div className="grid gap-12 lg:grid-cols-12">
                  <div className="lg:col-span-8 lg:col-start-1">
                    <div className="prose-vc" dangerouslySetInnerHTML={{ __html: lead }} />
                    {more && <details className="group"><summary className="cursor-pointer list-none text-sm font-bold text-blue-500 underline decoration-teal-400 decoration-2 underline-offset-4 group-open:hidden">Read more</summary><div className="prose-vc" dangerouslySetInnerHTML={{ __html: more }} /></details>}
                  </div>
                  {page.template === 'offer' && <aside className="lg:col-span-4"><div className="rounded-[var(--radius-card)] bg-teal-50 p-8"><p className="eyebrow text-teal-700">Special offer</p><p className="mt-3 text-sm text-ink-soft">Terms, availability and booking are set by the partner hotel. Confirm details directly before booking.</p></div></aside>}
                </div>
              </div>
            )}
            {dirBlock && <Directory path={path} block={dirBlock} sp={sp} />}
            <Blocks blocks={blocks.filter((b) => b.type !== 'directory')} />
            {kids.length > 0 && (
              <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8" aria-labelledby="explore-more">
                <h2 id="explore-more" className="font-display text-5xl text-navy">Explore {page.title.toLowerCase().startsWith('things') ? 'more' : page.title}</h2>
                <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {kids.map((k, i) => (
                    <li key={k.path} data-reveal style={{ '--reveal-delay': `${(i % 3) * 70}ms` } as React.CSSProperties}>
                      <Link href={k.path} className="group block h-full overflow-hidden rounded-[var(--radius-card)] bg-mist">
                        <div className="relative aspect-[16/10] overflow-hidden"><Img src={k.image} alt={k.imageAlt ?? ''} fill sizes="33vw" className="object-cover transition duration-[1.2s] group-hover:scale-105" /></div>
                        <div className="flex items-start justify-between gap-4 p-6"><div><p className="text-xl font-bold text-navy">{k.title}</p>{k.summary && <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{k.summary}</p>}</div><ArrowUpRight className="size-5 shrink-0 text-teal-600 transition group-hover:rotate-45" aria-hidden /></div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      <div className="h-16" />
    </>
  );
}
