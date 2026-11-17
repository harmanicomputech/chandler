import Link from 'next/link';
import { queryArticles } from '@/lib/content';
import { StoryCard } from './Cards';

export async function BlogIndex({ sp }: { sp: Record<string, string | undefined> }) {
  const page = Math.max(1, Number(sp.page) || 1); const PER = 13;
  const res = await queryArticles({ q: sp.q || undefined, limit: PER, offset: (page - 1) * PER });
  const pages = Math.ceil(res.total / PER);
  const [lead, ...rest] = res.rows;
  return (
    <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8">
      <form method="get" action="/blog/" role="search" className="mb-12 flex max-w-xl gap-2"><label htmlFor="bq" className="sr-only">Search stories</label><input id="bq" name="q" defaultValue={sp.q} placeholder="Search stories" className="flex-1 rounded-full border border-line px-5 py-3" /><button className="rounded-full bg-blue-500 px-6 font-bold text-white">Search</button></form>
      {lead && page === 1 && !sp.q && <div className="mb-16" data-reveal><StoryCard a={lead} feature /></div>}
      <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">{(page === 1 && !sp.q ? rest : res.rows).map((a, i) => <div key={a.id} data-reveal style={{ '--reveal-delay': `${(i % 3) * 70}ms` } as React.CSSProperties}><StoryCard a={a} /></div>)}</div>
      {pages > 1 && <nav aria-label="Pagination" className="mt-14 flex flex-wrap justify-center gap-2">{Array.from({ length: pages }, (_, i) => i + 1).map((n) => <Link key={n} href={`/blog/?page=${n}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ''}`} aria-current={n === page ? 'page' : undefined} className={`grid size-11 place-items-center rounded-full text-sm font-bold ${n === page ? 'bg-navy text-white' : 'bg-mist'}`}>{n}</Link>)}</nav>}
    </section>
  );
}
