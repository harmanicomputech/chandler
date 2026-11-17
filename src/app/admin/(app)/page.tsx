import Link from 'next/link';
import { desc, eq, sql, and, gte } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser, can } from '@/lib/auth';
import { PageHeader, Card, Badge, fmt } from '@/components/admin/ui';
import { CONTENT_TYPES } from '@/lib/cms-registry';

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser();
  if (user.role === 'stakeholder') { const { redirect } = await import('next/navigation'); redirect('/admin/portal/'); }
  const denied = (await searchParams).denied;
  const count = async (t: any, where?: any) => (await db.select({ n: sql<number>`count(*)::int` }).from(t).where(where))[0].n;
  const [listings, events, pages, articles, props, media, newSubs] = await Promise.all([
    count(schema.listings, eq(schema.listings.status, 'published')), count(schema.events, eq(schema.events.status, 'published')), count(schema.pages), count(schema.articles), count(schema.properties), count(schema.media), count(schema.submissions, eq(schema.submissions.status, 'new')),
  ]);
  const pending = (await Promise.all(Object.values(CONTENT_TYPES).filter((c) => c.workflow).map(async (c) => (await db.select({ id: c.table.id, title: c.table[c.titleField], updatedAt: c.table.updatedAt }).from(c.table).where(eq(c.table.status, 'in_review')).limit(10)).map((r: any) => ({ ...r, type: c.key, label: c.label }))))).flat();
  const [subs, upcoming, activity, integ, views] = await Promise.all([
    db.select().from(schema.submissions).orderBy(desc(schema.submissions.createdAt)).limit(8),
    db.select({ id: schema.events.id, title: schema.events.title, startDate: schema.events.startDate }).from(schema.events).where(and(eq(schema.events.status, 'published'), sql`${schema.events.startDate} >= current_date`)).orderBy(schema.events.startDate).limit(6),
    db.select({ a: schema.auditLogs, name: schema.users.name }).from(schema.auditLogs).leftJoin(schema.users, eq(schema.auditLogs.userId, schema.users.id)).orderBy(desc(schema.auditLogs.createdAt)).limit(10),
    db.select().from(schema.integrations).orderBy(schema.integrations.key),
    db.select({ name: schema.analyticsEvents.name, n: sql<number>`count(*)::int` }).from(schema.analyticsEvents).where(gte(schema.analyticsEvents.createdAt, sql`now() - interval '30 days'`)).groupBy(schema.analyticsEvents.name).orderBy(desc(sql`count(*)`)).limit(8),
  ]);
  const stats: [string, number, string][] = [['Published listings', listings, '/admin/content/listings/'], ['Published events', events, '/admin/content/events/'], ['Pages', pages, '/admin/content/pages/'], ['Articles', articles, '/admin/content/articles/'], ['Properties', props, '/admin/content/properties/'], ['Media items', media, '/admin/media/'], ['New submissions', newSubs, '/admin/submissions/']];
  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle="Overview of both websites" />
      {denied && <p role="alert" className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">You don’t have permission for that area.</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">{stats.map(([l, n, h]) => <Link key={l} href={h} className="rounded-lg border border-slate-200 bg-white p-4 hover:border-[#214FA1]"><p className="text-2xl font-semibold">{n.toLocaleString()}</p><p className="text-xs text-slate-600">{l}</p></Link>)}</div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title={`Pending approval (${pending.length})`} className="xl:col-span-2">
          {pending.length ? <ul className="divide-y divide-slate-100">{pending.map((p: any) => <li key={p.type + p.id} className="flex items-center justify-between py-2.5 text-sm"><Link href={`/admin/content/${p.type}/${p.id}/`} className="font-medium hover:underline">{p.title}</Link><span className="text-xs text-slate-600">{p.label} · {fmt(p.updatedAt)}</span></li>)}</ul> : <p className="text-sm text-slate-600">Nothing waiting for approval.</p>}
        </Card>
        <Card title="Integration status" action={can(user, 'settings.manage') ? <Link href="/admin/settings/" className="text-xs text-[#214FA1]">Manage</Link> : undefined}>
          <ul className="space-y-2 text-sm">{integ.map((i) => <li key={i.key} className="flex items-center justify-between gap-2"><span className="truncate">{i.label}</span>{i.enabled ? <Badge value={i.lastStatus} /> : <Badge value="not_configured" />}</li>)}</ul>
        </Card>
        <Card title="Recent submissions" action={<Link href="/admin/submissions/" className="text-xs text-[#214FA1]">All</Link>} className="xl:col-span-2">
          {subs.length ? <table className="w-full text-sm"><tbody>{subs.map((s) => <tr key={s.id} className="border-b border-slate-100 last:border-0"><td className="py-2"><Link href={`/admin/submissions/${s.id}/`} className="font-medium hover:underline">{s.subject}</Link><p className="text-xs text-slate-600">{s.name} · {s.type.replace(/_/g, ' ')} · {s.site}</p></td><td className="text-right"><Badge value={s.status} /></td></tr>)}</tbody></table> : <p className="text-sm text-slate-600">No submissions yet.</p>}
        </Card>
        <Card title="Upcoming events"><ul className="space-y-2 text-sm">{upcoming.map((e) => <li key={e.id} className="flex justify-between gap-3"><Link href={`/admin/content/events/${e.id}/`} className="truncate hover:underline">{e.title}</Link><span className="shrink-0 text-xs text-slate-600">{e.startDate}</span></li>)}{!upcoming.length && <li className="text-slate-600">None scheduled.</li>}</ul></Card>
        <Card title="Engagement · last 30 days (first-party)" className="xl:col-span-1">{views.length ? <ul className="space-y-1.5 text-sm">{views.map((v) => <li key={v.name} className="flex justify-between"><span>{v.name.replace(/_/g, ' ')}</span><span className="font-mono">{v.n}</span></li>)}</ul> : <p className="text-sm text-slate-600">No tracked interactions yet. Figures appear as visitors use the sites — nothing is estimated.</p>}</Card>
        <Card title="Recent activity" className="xl:col-span-2">{activity.length ? <ul className="space-y-2 text-sm">{activity.map(({ a, name }) => <li key={a.id} className="flex justify-between gap-3"><span><span className="font-medium">{name ?? 'System'}</span> · {a.action}{a.entity && ` ${a.entity} #${a.entityId}`}</span><span className="shrink-0 text-xs text-slate-600">{fmt(a.createdAt)}</span></li>)}</ul> : <p className="text-sm text-slate-600">No activity yet.</p>}</Card>
      </div>
    </>
  );
}
