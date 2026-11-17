import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser, can } from '@/lib/auth';
import { PageHeader, Card, Badge, fmt } from '@/components/admin/ui';
import { SubmissionForm } from '@/components/admin/SubmissionForm';
import { convertSubmission } from '../../../actions';

export default async function Submission({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser('submissions.view'); const id = Number((await params).id);
  const [s] = await db.select().from(schema.submissions).where(eq(schema.submissions.id, id)); if (!s) notFound();
  if (user.role !== 'admin' && !user.sites.includes(s.site)) notFound();
  const staff = await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(eq(schema.users.active, true));
  const convertible = ['event', 'partner', 'listing_update'].includes(s.type) && s.status !== 'approved';
  return (
    <>
      <PageHeader title={s.subject ?? 'Submission'} subtitle={`#${s.id} · ${s.type.replace(/_/g, ' ')} · ${s.site === 'visit' ? 'Visit Chandler' : 'Economic Development'} · ${fmt(s.createdAt)}`} actions={<><Badge value={s.status} /><Badge value={s.crmSyncStatus} /></>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title="Submitted information"><dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{Object.entries(s.payload).map(([k, v]) => <div key={k} className={String(v).length > 80 ? 'sm:col-span-2' : ''}><dt className="text-xs uppercase tracking-wider text-slate-600">{k.replace(/([A-Z])/g, ' $1')}</dt><dd className="mt-0.5 whitespace-pre-wrap break-words text-sm">{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}</dd></div>)}</dl></Card>
          <Card title="Activity">{s.notes.length ? <ol className="space-y-3 text-sm">{s.notes.map((n, i) => <li key={i} className="border-l-2 border-slate-200 pl-3"><p className="text-xs text-slate-600">{n.by} · {fmt(n.at)}</p><p>{n.text}</p></li>)}</ol> : <p className="text-sm text-slate-600">No notes yet.</p>}</Card>
        </div>
        <aside className="space-y-6">
          {can(user, 'submissions.manage', s.site) && <SubmissionForm id={s.id} status={s.status} assignedTo={s.assignedTo} staff={staff} csrf={user.csrfToken} />}
          {convertible && can(user, 'submissions.manage', s.site) && <Card title="Approve into the CMS"><p className="text-sm text-slate-600">{s.type === 'listing_update' ? 'Apply the proposed changes to the listing (a version snapshot is saved first).' : `Create a DRAFT ${s.type === 'event' ? 'event' : 'listing'} from this submission. It will not be public until an editor publishes it.`}</p>
            <form action={convertSubmission.bind(null, s.id)} className="mt-3"><input type="hidden" name="_csrf" value={user.csrfToken} /><button className="w-full rounded-md bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700">{s.type === 'listing_update' ? 'Approve & apply changes' : 'Approve & create draft'}</button></form></Card>}
          <Card title="Contact"><p className="text-sm">{s.name}</p>{s.email && <a href={`mailto:${s.email}`} className="text-sm text-[#214FA1]">{s.email}</a>}{s.organisation && <p className="text-sm text-slate-600">{s.organisation}</p>}</Card>
        </aside>
      </div>
    </>
  );
}
