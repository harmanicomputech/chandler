import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth';
import { PageHeader, Card } from '@/components/admin/ui';
export default async function Analytics({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireUser('submissions.view');
  const days = [7, 30, 90].includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const since = sql`now() - make_interval(days => ${days})`;
  const ae = schema.analyticsEvents;
  const [byName, topListings, topProps, subs] = await Promise.all([
    db.select({ site: ae.site, name: ae.name, n: sql<number>`count(*)::int` }).from(ae).where(gte(ae.createdAt, since)).groupBy(ae.site, ae.name).orderBy(desc(sql`count(*)`)),
    db.select({ id: ae.entityId, name: schema.listings.name, n: sql<number>`count(*)::int` }).from(ae).innerJoin(schema.listings, eq(ae.entityId, schema.listings.id)).where(and(eq(ae.name, 'listing_view'), gte(ae.createdAt, since))).groupBy(ae.entityId, schema.listings.name).orderBy(desc(sql`count(*)`)).limit(10),
    db.select({ id: ae.entityId, name: schema.properties.name, n: sql<number>`count(*)::int` }).from(ae).innerJoin(schema.properties, eq(ae.entityId, schema.properties.id)).where(and(eq(ae.name, 'property_view'), gte(ae.createdAt, since))).groupBy(ae.entityId, schema.properties.name).orderBy(desc(sql`count(*)`)).limit(10),
    db.select({ type: schema.submissions.type, n: sql<number>`count(*)::int` }).from(schema.submissions).where(gte(schema.submissions.createdAt, since)).groupBy(schema.submissions.type),
  ]);
  const List = ({ rows }: { rows: { name: string | null; n: number }[] }) => rows.length ? <ul className="space-y-1.5 text-sm">{rows.map((r, i) => <li key={i} className="flex justify-between gap-3"><span className="truncate">{r.name}</span><span className="font-mono">{r.n}</span></li>)}</ul> : <p className="text-sm text-slate-600">No data recorded in this period.</p>;
  return (<>
    <PageHeader title="Analytics" subtitle="First-party, cookieless interaction counts recorded by the platform. Actual recorded events only — no projections. GA4 reports live in Google Analytics." actions={<>{[7, 30, 90].map((d) => <a key={d} href={`?days=${d}`} className={`rounded-md px-3 py-1.5 text-sm ${d === days ? 'bg-slate-800 text-white' : 'bg-white ring-1 ring-slate-200'}`}>{d} days</a>)}</>} />
    <div className="grid gap-6 xl:grid-cols-2">
      <Card title="Visit Chandler events"><List rows={byName.filter((r) => r.site === 'visit').map((r) => ({ name: r.name.replace(/_/g, ' '), n: r.n }))} /></Card>
      <Card title="Economic Development events"><List rows={byName.filter((r) => r.site === 'edo').map((r) => ({ name: r.name.replace(/_/g, ' '), n: r.n }))} /></Card>
      <Card title="Most viewed listings"><List rows={topListings} /></Card>
      <Card title="Most viewed properties"><List rows={topProps} /></Card>
      <Card title="Submissions by type"><List rows={subs.map((s) => ({ name: s.type.replace(/_/g, ' '), n: s.n }))} /></Card>
    </div>
  </>);
}
