import Link from 'next/link';
import { and, asc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';

/** Human-readable sitemap generated from the CMS (replaces the legacy /sitemap/ page). */
export async function SiteMapIndex() {
  const rows = await db.select({ path: schema.pages.path, title: schema.pages.title, section: schema.pages.section }).from(schema.pages)
    .where(and(eq(schema.pages.site, 'visit'), eq(schema.pages.status, 'published'), eq(schema.pages.noindex, false))).orderBy(asc(schema.pages.path));
  const groups = new Map<string, typeof rows>();
  rows.filter((r) => !r.path.startsWith('/media-gallery/item')).forEach((r) => { const k = r.section || '/'; groups.set(k, [...(groups.get(k) ?? []), r]); });
  const title = (k: string) => rows.find((r) => r.path === k + '/')?.title ?? 'General';
  const more = [...groups.entries()].filter(([, l]) => l.length === 1).flatMap(([, l]) => l);
  for (const [k, l] of [...groups.entries()]) if (l.length === 1) groups.delete(k);
  if (more.length) groups.set('__more', more.sort((a, b) => a.title.localeCompare(b.title)));
  return (
    <section className="mx-auto max-w-[1440px] columns-1 gap-10 px-5 py-14 sm:columns-2 sm:px-8 lg:columns-3">
      {[...groups.entries()].sort((a, b) => b[1].length - a[1].length).map(([k, list]) => (
        <div key={k} className="mb-10 break-inside-avoid"><h2 className="font-display text-3xl text-navy">{k === '__more' ? 'More pages' : title(k)}</h2>
          <ul className="mt-3 space-y-1.5">{list.map((r) => <li key={r.path}><Link href={r.path} className="text-sm text-ink-soft hover:text-blue-500 hover:underline">{r.title}</Link></li>)}</ul></div>
      ))}
    </section>
  );
}
