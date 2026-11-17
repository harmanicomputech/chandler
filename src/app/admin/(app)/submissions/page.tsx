import Link from 'next/link';
import { and, desc, eq, type SQL } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth';
import { PageHeader, Badge, fmt } from '@/components/admin/ui';
import { retryCrmSync } from '../../actions';

export default async function Submissions({ searchParams }: { searchParams: Promise<{ type?: string; status?: string; site?: string }> }) {
  const user = await requireUser('submissions.view'); const sp = await searchParams;
  const w: SQL[] = [];
  if (sp.type) w.push(eq(schema.submissions.type, sp.type as 'event')); if (sp.status) w.push(eq(schema.submissions.status, sp.status as 'new'));
  const sites = user.role === 'admin' ? ['visit', 'edo'] : user.sites;
  const rows = (await db.select().from(schema.submissions).where(w.length ? and(...w) : undefined).orderBy(desc(schema.submissions.createdAt)).limit(200)).filter((r) => sites.includes(r.site) && (!sp.site || r.site === sp.site));
  return (
    <>
      <PageHeader title="Submissions & enquiries" subtitle="Event submissions, partner requests, RFPs, wedding, investor, property and business enquiries from both sites."
        actions={<form action={retryCrmSync}><input type="hidden" name="_csrf" value={user.csrfToken} /><button className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Retry CRM sync</button></form>} />
      <form className="mb-4 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <select name="type" defaultValue={sp.type ?? ''} aria-label="Type" className="rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="">All types</option>{schema.submissionTypeEnum.enumValues.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select>
        <select name="status" defaultValue={sp.status ?? ''} aria-label="Status" className="rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="">Any status</option>{schema.submissionStatusEnum.enumValues.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select>
        <select name="site" defaultValue={sp.site ?? ''} aria-label="Site" className="rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="">Both sites</option><option value="visit">Visit Chandler</option><option value="edo">EDO</option></select>
        <button className="rounded-md bg-slate-800 px-4 text-sm text-white">Filter</button></form>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="px-4 py-3">Subject</th><th>Type</th><th>Site</th><th>From</th><th>Received</th><th>CRM</th><th>Status</th></tr></thead>
        <tbody>{rows.map((s) => <tr key={s.id} className="border-b border-slate-100"><td className="px-4 py-2.5"><Link href={`/admin/submissions/${s.id}/`} className="font-medium text-[#214FA1] hover:underline">{s.subject}</Link></td><td className="capitalize">{s.type.replace(/_/g, ' ')}</td><td>{s.site}</td><td>{s.name}<br /><span className="text-xs text-slate-600">{s.organisation}</span></td><td className="text-xs">{fmt(s.createdAt)}</td><td><Badge value={s.crmSyncStatus} /></td><td><Badge value={s.status} /></td></tr>)}
          {!rows.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-600">No submissions.</td></tr>}</tbody></table></div>
    </>
  );
}
