import { desc, ilike, or, sql, eq } from 'drizzle-orm';
import Link from 'next/link';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth';
import { PageHeader, Badge } from '@/components/admin/ui';
import { MediaUpload, MediaEdit } from '@/components/admin/MediaForms';

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ q?: string; folder?: string; perm?: string; page?: string; edit?: string }> }) {
  const user = await requireUser('media.manage'); const sp = await searchParams; const page = Math.max(1, Number(sp.page) || 1);
  const conds = [sp.q ? or(ilike(schema.media.alt, `%${sp.q}%`), ilike(schema.media.url, `%${sp.q}%`)) : undefined, sp.folder ? eq(schema.media.folder, sp.folder) : undefined, sp.perm ? eq(schema.media.permission, sp.perm) : undefined].filter(Boolean);
  const where = conds.length ? sql.join(conds as any[], sql` and `) : undefined;
  const [rows, [{ n }], folders, edit] = await Promise.all([
    db.select().from(schema.media).where(where).orderBy(desc(schema.media.id)).limit(48).offset((page - 1) * 48),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.media).where(where),
    db.selectDistinct({ f: schema.media.folder }).from(schema.media),
    sp.edit ? db.select().from(schema.media).where(eq(schema.media.id, Number(sp.edit))).then((r) => r[0]) : null,
  ]);
  return (
    <>
      <PageHeader title="Media library" subtitle={`${n.toLocaleString()} images shared across both websites`} />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div>
          <form className="mb-4 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3"><label htmlFor="mq" className="sr-only">Search</label><input id="mq" name="q" defaultValue={sp.q} placeholder="Search alt text or file name" className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <select name="folder" defaultValue={sp.folder ?? ''} aria-label="Folder" className="rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="">All folders</option>{folders.map((f) => f.f && <option key={f.f}>{f.f}</option>)}</select>
            <select name="perm" defaultValue={sp.perm ?? ''} aria-label="Permission" className="rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="">Any permission</option>{['pending', 'approved', 'restricted'].map((p) => <option key={p}>{p}</option>)}</select><button className="rounded-md bg-slate-800 px-4 text-sm text-white">Filter</button></form>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">{rows.map((m) => (
            <li key={m.id} className={`overflow-hidden rounded-lg border bg-white ${sp.edit === String(m.id) ? 'border-[#214FA1] ring-2 ring-[#214FA1]/30' : 'border-slate-200'}`}><Link href={`?${new URLSearchParams({ ...sp, edit: String(m.id) } as Record<string, string>)}`} className="block"><img src={m.url} alt={m.alt} loading="lazy" className="aspect-[4/3] w-full object-cover" /><div className="p-2"><p className="truncate text-xs">{m.alt || <em className="text-red-600">Missing alt text</em>}</p><div className="mt-1 flex items-center justify-between"><Badge value={m.permission} /><span className="text-[10px] text-slate-400">{m.width}×{m.height}</span></div></div></Link></li>
          ))}</ul>
          <nav className="mt-4 flex gap-2" aria-label="Pagination">{page > 1 && <Link href={`?${new URLSearchParams({ ...sp, page: String(page - 1) } as Record<string, string>)}`} className="rounded bg-white px-3 py-1.5 text-sm ring-1 ring-slate-200">← Previous</Link>}{page * 48 < n && <Link href={`?${new URLSearchParams({ ...sp, page: String(page + 1) } as Record<string, string>)}`} className="rounded bg-white px-3 py-1.5 text-sm ring-1 ring-slate-200">Next →</Link>}</nav>
        </div>
        <aside className="space-y-6">{edit && <MediaEdit media={edit} csrf={user.csrfToken} />}<MediaUpload csrf={user.csrfToken} /></aside>
      </div>
    </>
  );
}
