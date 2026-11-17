import { desc, ilike, or, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth';
import { PageHeader, Card } from '@/components/admin/ui';
import { RedirectForm } from '@/components/admin/RedirectForm';
import { deleteRedirect } from '../../actions';
export default async function Redirects({ searchParams }: { searchParams: Promise<{ q?: string; site?: string }> }) {
  const user = await requireUser('redirects.manage'); const sp = await searchParams;
  const rows = await db.select().from(schema.redirects).where(sp.q ? or(ilike(schema.redirects.fromPath, `%${sp.q}%`), ilike(schema.redirects.toPath, `%${sp.q}%`)) : sp.site ? eq(schema.redirects.site, sp.site as 'visit') : undefined).orderBy(desc(schema.redirects.id)).limit(300);
  return (
    <>
      <PageHeader title="Redirects" subtitle="301/302 register. Legacy URLs and moved pages. Page path changes create redirects automatically." actions={<a href="/api/admin/redirects.csv" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Export CSV</a>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <form className="mb-3 flex gap-2"><input name="q" defaultValue={sp.q} aria-label="Search redirects" placeholder="Search paths" className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" /><button className="rounded-md bg-slate-800 px-3 text-sm text-white">Search</button></form>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-600"><tr><th className="py-2">Site</th><th>From</th><th>To</th><th>Code</th><th>Hits</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-slate-100"><td className="py-2 text-xs">{r.site}</td><td className="max-w-[260px] truncate font-mono text-xs" title={r.fromPath}>{r.fromPath}</td><td className="max-w-[260px] truncate font-mono text-xs" title={r.toPath}>{r.toPath}</td><td>{r.statusCode}</td><td>{r.hits}</td>
              <td><form action={deleteRedirect}><input type="hidden" name="_csrf" value={user.csrfToken} /><input type="hidden" name="id" value={r.id} /><button className="text-xs text-red-600">Delete</button></form></td></tr>)}</tbody></table></div>
        </Card>
        <RedirectForm csrf={user.csrfToken} />
      </div>
    </>
  );
}
