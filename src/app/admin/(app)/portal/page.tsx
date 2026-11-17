import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth';
import { PageHeader, Card, Badge, fmt } from '@/components/admin/ui';
import { ProposeForm } from '@/components/admin/ProposeForm';
/** Stakeholder portal: partners see only listings linked to their account and propose moderated updates. */
export default async function Portal() {
  const user = await requireUser('stakeholder.propose');
  const [mine, subs] = await Promise.all([db.select().from(schema.listings).where(eq(schema.listings.ownerUserId, user.id)), db.select().from(schema.submissions).where(eq(schema.submissions.submittedBy, user.id)).orderBy(desc(schema.submissions.createdAt)).limit(20)]);
  return (<>
    <PageHeader title="Partner portal" subtitle={`${user.organisation ?? user.name} · Propose updates to your listings. The Visit Chandler team reviews every change before it goes live.`} />
    {!mine.length && <Card><p className="text-sm text-slate-600">No listings are linked to your account yet. Contact the tourism team to link your business, or <Link href="/partnerwithus/" className="text-[#214FA1] underline">request a new listing</Link>.</p></Card>}
    <div className="space-y-6">{mine.map((l) => <ProposeForm key={l.id} listing={{ id: l.id, name: l.name, descriptionHtml: l.descriptionHtml, phone: l.phone, website: l.website, email: l.email, hours: l.hours, bookingUrl: l.bookingUrl, status: l.status }} csrf={user.csrfToken} />)}</div>
    <Card title="My requests" className="mt-6">{subs.length ? <ul className="divide-y divide-slate-100 text-sm">{subs.map((s) => <li key={s.id} className="flex justify-between py-2"><span>{s.subject}</span><span className="flex items-center gap-3 text-xs text-slate-600">{fmt(s.createdAt)}<Badge value={s.status} /></span></li>)}</ul> : <p className="text-sm text-slate-600">No requests yet.</p>}</Card>
  </>);
}
