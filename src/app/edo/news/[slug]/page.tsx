import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticle } from '@/lib/content';
import { sanitizeHtml } from '@/lib/sanitize';
import { EdoHero } from '@/components/edo/EdoHero';
import { edo } from '@/lib/edo';
type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> { const a = await getArticle('edo', (await params).slug); return a ? { title: a.title, description: a.excerpt ?? undefined } : {}; }
export default async function Article({ params }: P) {
  const a = await getArticle('edo', (await params).slug); if (!a) notFound();
  return (<>
    <EdoHero title={a.title} eyebrow={a.categories[0]} image={a.image?.url} crumbs={[{ label: 'Economic Development', href: edo('/') }, { label: 'News', href: edo('/news/') }, { label: a.title, href: '#' }]} />
    <article className="prose-edo mx-auto max-w-3xl px-5 py-14 sm:px-8" dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.bodyHtml) }} />
    {a.sourceUrl && <p className="mx-auto max-w-3xl px-5 pb-14 font-mono text-[11px] text-edo-slate sm:px-8">Originally published at <a href={a.sourceUrl} className="underline">{a.sourceUrl}</a></p>}
  </>);
}
