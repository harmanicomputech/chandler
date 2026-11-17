import type { Metadata } from 'next';
import Link from 'next/link';
import { queryArticles } from '@/lib/content';
import { EdoHero } from '@/components/edo/EdoHero';
import { Img } from '@/components/shared/Img';
import { edo } from '@/lib/edo';
export const metadata: Metadata = { title: 'News & Insights' };
export default async function News() {
  const { rows } = await queryArticles({ site: 'edo', limit: 50 });
  return (<>
    <EdoHero title="News & insights" crumbs={[{ label: 'Economic Development', href: edo('/') }, { label: 'News', href: edo('/news/') }]} />
    <ul className="mx-auto grid max-w-[1440px] gap-8 px-5 py-12 sm:px-8 md:grid-cols-2 lg:grid-cols-3">{rows.map((a) => (
      <li key={a.id}><Link href={edo(`/news/${a.slug}/`)} className="group block border border-edo-line"><div className="relative aspect-[16/9] bg-edo-navy"><Img src={a.image} alt="" fill sizes="33vw" className="object-cover" /></div><div className="p-6"><p className="font-mono text-[11px] uppercase text-edo-skytext">{a.categories[0]}</p><p className="mt-2 font-[family-name:var(--font-edo-display)] text-lg font-bold text-edo-navy group-hover:underline">{a.title}</p>{a.excerpt && <p className="mt-2 line-clamp-3 text-sm text-edo-slate">{a.excerpt}</p>}</div></Link></li>
    ))}</ul>
  </>);
}
