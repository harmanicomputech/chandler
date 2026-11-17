import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticle, queryArticles } from '@/lib/content';
import { sanitizeHtml, excerpt, stripTags } from '@/lib/sanitize';
import { Breadcrumbs } from '@/components/visit/PageHero';
import { Img } from '@/components/shared/Img';
import { JsonLd } from '@/components/shared/JsonLd';
import { StoryCard, articleHref } from '@/components/visit/Cards';
import { TrackView } from '@/components/visit/TrackView';
import { ShareButtons } from '@/components/visit/ShareButtons';
import { followRedirect } from '@/lib/redirects';

type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const a = await getArticle('visit', (await params).slug); if (!a) return {};
  return { title: { absolute: a.seoTitle ?? a.title }, description: a.seoDescription ?? a.excerpt ?? undefined, alternates: { canonical: articleHref(a) }, openGraph: { type: 'article', images: a.ogImage ? [a.ogImage] : a.image?.url ? [a.image.url] : undefined } };
}

export default async function ArticlePage({ params }: P) {
  const { slug } = await params;
  const a = await getArticle('visit', slug);
  if (!a) { await followRedirect('visit', `/blog/post/${slug}/`); notFound(); }
  const words = stripTags(a.bodyHtml).split(' ').length;
  const related = (await queryArticles({ limit: 4 })).rows.filter((r) => r.slug !== a.slug).slice(0, 3);
  return (
    <article>
      <TrackView site="visit" name="article_view" entity="article" id={a.id} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: a.title, datePublished: a.publishedOn ?? undefined, author: a.author ? { '@type': 'Person', name: a.author } : { '@type': 'Organization', name: 'Visit Chandler' }, image: a.image?.url ?? undefined, description: a.excerpt ?? excerpt(a.bodyHtml, 200) }} />
      <header className="mx-auto max-w-[1100px] px-5 pt-32 text-center sm:px-8">
        <div className="flex justify-center"><Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog/' }, { label: a.title, href: articleHref(a) }]} /></div>
        <p className="eyebrow mt-10 text-teal-700">{a.publishedOn ? new Date(a.publishedOn + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Story'} · {Math.max(1, Math.round(words / 230))} min read</p>
        <h1 className="mx-auto mt-5 max-w-4xl font-display text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.95] text-navy">{a.title}</h1>
        {a.author && <p className="mt-6 text-ink-soft">By {a.author}</p>}
      </header>
      {a.image?.url && <div className="mx-auto mt-12 max-w-[1440px] px-5 sm:px-8"><div className="relative aspect-[21/9] overflow-hidden rounded-[var(--radius-card)]" data-reveal="mask"><Img src={a.image.url} alt={a.image.alt || ''} fill priority sizes="100vw" className="object-cover" /></div></div>}
      <div className="mx-auto max-w-[760px] px-5 py-16 sm:px-8">
        <div className="prose-vc text-[1.125rem]" dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.bodyHtml) }} />
        <div className="mt-12 flex items-center justify-between border-t border-line pt-6"><p className="text-sm font-semibold text-navy">Share this story</p><ShareButtons title={a.title} light /></div>
      </div>
      {related.length > 0 && <section className="bg-mist py-20"><div className="mx-auto max-w-[1440px] px-5 sm:px-8"><h2 className="font-display text-5xl text-navy">Keep reading</h2><div className="mt-10 grid gap-10 md:grid-cols-3">{related.map((r) => <StoryCard key={r.id} a={r} />)}</div></div></section>}
    </article>
  );
}
