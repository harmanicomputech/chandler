import { asc, and, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth';
import { PageHeader, Card } from '@/components/admin/ui';
import { saveNav, deleteNav } from '../../actions';

export default async function Navigation({ searchParams }: { searchParams: Promise<{ site?: string; menu?: string }> }) {
  const user = await requireUser('nav.manage'); const sp = await searchParams;
  const site = sp.site === 'edo' ? 'edo' : 'visit'; const menu = sp.menu ?? 'main';
  const rows = await db.select().from(schema.navItems).where(and(eq(schema.navItems.site, site), eq(schema.navItems.menu, menu))).orderBy(asc(schema.navItems.sort));
  const top = rows.filter((r) => !r.parentId);
  const input = 'rounded border border-slate-300 px-2 py-1.5 text-sm';
  const Row = ({ r, indent }: { r: (typeof rows)[number]; indent?: boolean }) => (
    <form action={saveNav} className={`flex flex-wrap items-center gap-2 border-b border-slate-100 py-2 ${indent ? 'pl-8' : ''}`}>
      <input type="hidden" name="_csrf" value={user.csrfToken} /><input type="hidden" name="id" value={r.id} /><input type="hidden" name="site" value={site} /><input type="hidden" name="menu" value={menu} /><input type="hidden" name="parentId" value={r.parentId ?? ''} />
      <input name="sort" type="number" defaultValue={r.sort} aria-label="Order" className={`${input} w-16`} /><input name="label" defaultValue={r.label} aria-label="Label" className={`${input} w-56`} /><input name="href" defaultValue={r.href} aria-label="Link" className={`${input} flex-1`} />
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="visible" defaultChecked={r.visible} />Visible</label>
      <button className="rounded bg-slate-800 px-3 py-1.5 text-xs text-white">Save</button>
      <button formAction={deleteNav} className="rounded px-2 py-1.5 text-xs text-red-600">Delete</button>
    </form>
  );
  return (
    <>
      <PageHeader title="Navigation" subtitle="Menus for each website. Changes publish immediately." />
      <div className="mb-4 flex flex-wrap gap-2">{(['visit', 'edo'] as const).flatMap((s) => (s === 'visit' ? ['main', 'utility', 'footer', 'legal'] : ['main']).map((m) => <a key={s + m} href={`?site=${s}&menu=${m}`} className={`rounded-md px-3 py-1.5 text-sm ${site === s && menu === m ? 'bg-slate-800 text-white' : 'bg-white ring-1 ring-slate-200'}`}>{s === 'visit' ? 'Visit Chandler' : 'EDO'} · {m}</a>))}</div>
      <Card title={`${site === 'visit' ? 'Visit Chandler' : 'Economic Development'} — ${menu} menu`}>
        {top.map((t) => <div key={t.id}><Row r={t} />{rows.filter((c) => c.parentId === t.id).map((c) => <Row key={c.id} r={c} indent />)}</div>)}
        <form action={saveNav} className="mt-4 flex flex-wrap items-center gap-2 rounded-md bg-slate-50 p-3">
          <input type="hidden" name="_csrf" value={user.csrfToken} /><input type="hidden" name="site" value={site} /><input type="hidden" name="menu" value={menu} /><input type="hidden" name="visible" value="on" />
          <span className="text-sm font-medium">Add item</span><select name="parentId" aria-label="Parent" className={input}><option value="">Top level</option>{top.map((t) => <option key={t.id} value={t.id}>Under: {t.label}</option>)}</select>
          <input name="label" required placeholder="Label" className={input} /><input name="href" required placeholder="/path/" className={`${input} flex-1`} /><input name="sort" type="number" defaultValue={99} aria-label="Order" className={`${input} w-16`} /><button className="rounded bg-[#214FA1] px-3 py-1.5 text-sm text-white">Add</button>
        </form>
      </Card>
    </>
  );
}
