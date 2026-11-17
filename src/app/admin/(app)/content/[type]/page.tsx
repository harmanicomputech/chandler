import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq, ilike, sql, type SQL } from 'drizzle-orm';
import { Plus, ExternalLink } from 'lucide-react';
import { db } from '@/db';
import { requireUser } from '@/lib/auth';
import { CONTENT_TYPES } from '@/lib/cms-registry';
import { PageHeader, Badge, Btn, fmt } from '@/components/admin/ui';

const PER = 40;
export default async function ContentList({ params, searchParams }: { params: Promise<{ type: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { type } = await params; const sp = await searchParams;
  const ct = CONTENT_TYPES[type]; if (!ct) notFound();
  await requireUser(ct.permission);
  const t = ct.table; const page = Math.max(1, Number(sp.page) || 1);
  const where: SQL[] = [];
  if (sp.q) where.push(ilike(t[ct.titleField], `%${sp.q.replace(/[%_]/g, '')}%`));
  if (sp.status && ct.workflow) where.push(eq(t.status, sp.status));
  if (sp.site && 'site' in t) where.push(eq(t.site, sp.site));
  if (sp.sub && 'type' in t) where.push(eq(t.type, sp.sub));
  const w = where.length ? and(...where) : undefined;
  const [rows, [{ n }]] = await Promise.all([db.select().from(t).where(w).orderBy(desc('updatedAt' in t ? t.updatedAt : t.id)).limit(PER).offset((page - 1) * PER), db.select({ n: sql<number>`count(*)::int` }).from(t).where(w)]);
  const pages = Math.ceil(n / PER);
  const qs = (o: Record<string, string | number | undefined>) => '?' + new URLSearchParams(Object.entries({ ...sp, ...o }).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString();
  const cell = (r: any, c: string) => { const v = r[c]; if (c === 'status' || c === 'availability') return <Badge value={v} />; if (v instanceof Date) return fmt(v); if (typeof v === 'boolean') return v ? 'Yes' : '—'; if (typeof v === 'number') return v.toLocaleString(); return String(v ?? '—'); };
  return (
    <>
      <PageHeader title={ct.plural} subtitle={`${n.toLocaleString()} records`} actions={<Btn href={`/admin/content/${type}/new/`}><Plus className="size-4" aria-hidden />New {ct.label.toLowerCase()}</Btn>} />
      <form className="mb-4 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3" role="search">
        <label className="sr-only" htmlFor="q">Search</label><input id="q" name="q" defaultValue={sp.q} placeholder={`Search ${ct.plural.toLowerCase()}`} className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        {ct.workflow && <><label className="sr-only" htmlFor="status">Status</label><select id="status" name="status" defaultValue={sp.status ?? ''} className="rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="">Any status</option>{['draft', 'in_review', 'published', 'archived'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></>}
        {'site' in t && <><label className="sr-only" htmlFor="site">Site</label><select id="site" name="site" defaultValue={sp.site ?? ''} className="rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="">Both sites</option><option value="visit">Visit Chandler</option><option value="edo">Economic Development</option></select></>}
        {ct.fields.find((f) => f.name === 'type')?.options && <><label className="sr-only" htmlFor="sub">Type</label><select id="sub" name="sub" defaultValue={sp.sub ?? ''} className="rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="">All types</option>{ct.fields.find((f) => f.name === 'type')!.options!.map((o) => <option key={o}>{o}</option>)}</select></>}
        <button className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white">Filter</button>
      </form>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-600"><tr>{ct.listColumns.map((c) => <th key={c} scope="col" className="px-4 py-3 font-medium">{c.replace(/([A-Z])/g, ' $1')}</th>)}<th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{rows.map((r: any) => (
            <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              {ct.listColumns.map((c, i) => <td key={c} className="max-w-[360px] truncate px-4 py-2.5">{i === 0 ? <Link href={`/admin/content/${type}/${r.id}/`} className="font-medium text-[#214FA1] hover:underline">{cell(r, c)}</Link> : cell(r, c)}</td>)}
              <td className="px-4 py-2.5 text-right">{ct.publicUrl?.(r) && r.status === 'published' && <a href={ct.publicUrl(r)!} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800"><ExternalLink className="size-3" aria-hidden />View</a>}</td>
            </tr>
          ))}{!rows.length && <tr><td colSpan={ct.listColumns.length + 1} className="px-4 py-10 text-center text-slate-600">No records match.</td></tr>}</tbody>
        </table>
      </div>
      {pages > 1 && <nav aria-label="Pagination" className="mt-4 flex flex-wrap gap-1">{Array.from({ length: Math.min(pages, 30) }, (_, i) => i + 1).map((p) => <Link key={p} href={qs({ page: p })} aria-current={p === page ? 'page' : undefined} className={`rounded px-3 py-1.5 text-sm ${p === page ? 'bg-slate-800 text-white' : 'bg-white ring-1 ring-slate-200'}`}>{p}</Link>)}</nav>}
    </>
  );
}
