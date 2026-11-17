import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser, ROLE_PERMISSIONS } from '@/lib/auth';
import { PageHeader, Card, Btn, fmt } from '@/components/admin/ui';
export default async function Users() {
  await requireUser('users.manage');
  const rows = await db.select().from(schema.users).orderBy(asc(schema.users.name));
  const perms = [...new Set(Object.values(ROLE_PERMISSIONS).flat())];
  return (
    <>
      <PageHeader title="Users & roles" actions={<Btn href="/admin/users/new/">New user</Btn>} />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="px-4 py-3">Name</th><th>Role</th><th>Sites</th><th>Last sign-in</th><th>Status</th></tr></thead>
        <tbody>{rows.map((u) => <tr key={u.id} className="border-b border-slate-100"><td className="px-4 py-2.5"><Link href={`/admin/users/${u.id}/`} className="font-medium text-[#214FA1] hover:underline">{u.name}</Link><br /><span className="text-xs text-slate-600">{u.email}</span></td><td className="capitalize">{u.role.replace('_', ' ')}</td><td>{u.sites.join(', ')}</td><td className="text-xs">{fmt(u.lastLoginAt)}</td><td>{u.active ? (u.lockedUntil && u.lockedUntil > new Date() ? 'Locked' : 'Active') : 'Disabled'}</td></tr>)}</tbody></table></div>
      <Card title="Role permissions" className="mt-6"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th className="py-2">Permission</th>{Object.keys(ROLE_PERMISSIONS).map((r) => <th key={r} className="capitalize">{r.replace('_', ' ')}</th>)}</tr></thead>
        <tbody>{perms.map((p) => <tr key={p} className="border-t border-slate-100"><td className="py-1.5 font-mono">{p}</td>{Object.values(ROLE_PERMISSIONS).map((list, i) => <td key={i}>{list.includes(p) ? '✓' : ''}</td>)}</tr>)}</tbody></table></div>
        <p className="mt-3 text-xs text-slate-600">Non-admin roles are additionally limited to the websites assigned to them. Stakeholders can only propose changes to listings linked to their account; all proposals are moderated.</p></Card>
    </>
  );
}
