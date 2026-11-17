import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth';
import { PageHeader, fmt } from '@/components/admin/ui';
export default async function Audit() {
  await requireUser('audit.view');
  const rows = await db.select({ a: schema.auditLogs, name: schema.users.name }).from(schema.auditLogs).leftJoin(schema.users, eq(schema.auditLogs.userId, schema.users.id)).orderBy(desc(schema.auditLogs.createdAt)).limit(300);
  return (<><PageHeader title="Audit log" subtitle="Every sign-in, content change, publication, permission change and moderation decision (latest 300)." />
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="px-4 py-3">When</th><th>User</th><th>Action</th><th>Entity</th><th>Detail</th><th>IP</th></tr></thead>
      <tbody>{rows.map(({ a, name }) => <tr key={a.id} className="border-b border-slate-100"><td className="px-4 py-2 text-xs">{fmt(a.createdAt)}</td><td>{name ?? '—'}</td><td className="font-mono text-xs">{a.action}</td><td className="text-xs">{a.entity ? `${a.entity} #${a.entityId}` : '—'}</td><td className="max-w-[280px] truncate font-mono text-xs">{JSON.stringify(a.detail)}</td><td className="text-xs">{a.ip ?? '—'}</td></tr>)}</tbody></table></div></>);
}
