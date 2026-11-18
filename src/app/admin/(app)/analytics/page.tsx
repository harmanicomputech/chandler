import Link from 'next/link';
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { ArrowDownRight, ArrowUpRight, Minus, Download } from 'lucide-react';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth';
import { PageHeader, Card } from '@/components/admin/ui';
import { TrendChart } from '@/components/admin/TrendChart';

/**
 * Analytics: first-party, cookieless interaction events recorded by the platform. Shows recorded counts only —
 * no projections or modelled conversions. GA4 (when configured) remains the source for sessions/users/traffic sources.
 */
const KPIS: { site: 'visit' | 'edo'; label: string; names: string[] }[] = [
  { site: 'visit', label: 'Listing views', names: ['listing_view'] }, { site: 'visit', label: 'Booking & website clicks', names: ['booking_click', 'website_click'] },
  { site: 'visit', label: 'Event views', names: ['event_view'] }, { site: 'visit', label: 'Itineraries created', names: ['itinerary_create'] },
  { site: 'visit', label: 'Newsletter sign-ups', names: ['newsletter_subscribe'] }, { site: 'visit', label: 'Weather centre visits', names: ['weather_view'] },
  { site: 'edo', label: 'Property views', names: ['property_view'] }, { site: 'edo', label: 'Property searches', names: ['property_search'] },
  { site: 'edo', label: 'Comparisons', names: ['property_compare'] }, { site: 'edo', label: 'Report downloads', names: ['report_download'] },
];
const BarList = ({ rows, unit }: { rows: { label: string; n: number; href?: string }[]; unit: string }) => {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return rows.length ? <ol className="space-y-2">{rows.map((r) => (
    <li key={r.label} className="text-sm"><div className="flex justify-between gap-3"><span className="truncate">{r.href ? <Link href={r.href} className="hover:underline">{r.label}</Link> : r.label}</span><span className="font-mono">{r.n.toLocaleString()}</span></div>
      <div className="mt-1 h-1.5 rounded-r bg-slate-100"><div className="h-1.5 rounded-r bg-[#214FA1]" style={{ width: `${(r.n / max) * 100}%` }} /></div></li>
  ))}</ol> : <p className="text-sm text-slate-600">No {unit} recorded in this period.</p>;
};

export default async function Analytics({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireUser('submissions.view');
  const d = Number((await searchParams).days); const days = [7, 30, 90].includes(d) ? d : 30;
  const ae = schema.analyticsEvents;
  const since = sql`date_trunc('day', now() at time zone 'America/Phoenix') - make_interval(days => ${days - 1})`;
  const prevSince = sql`date_trunc('day', now() at time zone 'America/Phoenix') - make_interval(days => ${2 * days - 1})`;
  const local = sql`(${ae.createdAt} at time zone 'America/Phoenix')`;
  const [cur, prev, daily, topListings, topProps, topPaths, subs, subsPrev] = await Promise.all([
    db.select({ site: ae.site, name: ae.name, n: sql<number>`count(*)::int` }).from(ae).where(gte(local, since)).groupBy(ae.site, ae.name),
    db.select({ site: ae.site, name: ae.name, n: sql<number>`count(*)::int` }).from(ae).where(and(gte(local, prevSince), lt(local, since))).groupBy(ae.site, ae.name),
    db.execute<{ site: string; day: string; n: number }>(sql`select s.site, to_char(g.day, 'YYYY-MM-DD') as day, coalesce(c.n, 0)::int as n
      from generate_series(${since}, date_trunc('day', now() at time zone 'America/Phoenix'), interval '1 day') g(day)
      cross join (values ('visit'), ('edo')) s(site)
      left join (select site::text, date_trunc('day', created_at at time zone 'America/Phoenix') d, count(*) n from analytics_events where created_at at time zone 'America/Phoenix' >= ${since} group by 1, 2) c on c.site = s.site and c.d = g.day
      order by s.site, g.day`),
    db.select({ id: ae.entityId, name: schema.listings.name, slug: schema.listings.slug, n: sql<number>`count(*)::int` }).from(ae).innerJoin(schema.listings, eq(ae.entityId, schema.listings.id)).where(and(eq(ae.name, 'listing_view'), gte(local, since))).groupBy(ae.entityId, schema.listings.name, schema.listings.slug).orderBy(desc(sql`count(*)`)).limit(10),
    db.select({ id: ae.entityId, name: schema.properties.name, n: sql<number>`count(*)::int` }).from(ae).innerJoin(schema.properties, eq(ae.entityId, schema.properties.id)).where(and(eq(ae.name, 'property_view'), gte(local, since))).groupBy(ae.entityId, schema.properties.name).orderBy(desc(sql`count(*)`)).limit(10),
    db.select({ path: ae.path, n: sql<number>`count(*)::int` }).from(ae).where(and(gte(local, since), sql`${ae.path} is not null and ${ae.path} <> ''`)).groupBy(ae.path).orderBy(desc(sql`count(*)`)).limit(10),
    db.select({ site: schema.submissions.site, type: schema.submissions.type, n: sql<number>`count(*)::int` }).from(schema.submissions).where(gte(sql`(${schema.submissions.createdAt} at time zone 'America/Phoenix')`, since)).groupBy(schema.submissions.site, schema.submissions.type),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.submissions).where(and(gte(sql`(${schema.submissions.createdAt} at time zone 'America/Phoenix')`, prevSince), lt(sql`(${schema.submissions.createdAt} at time zone 'America/Phoenix')`, since))),
  ]);
  const sum = (rows: typeof cur, site: string, names: string[]) => rows.filter((r) => r.site === site && names.includes(r.name)).reduce((a, r) => a + r.n, 0);
  const series = (site: string) => daily.rows.filter((r) => r.site === site).map((r) => ({ day: r.day, n: r.n }));
  const lv = sum(cur, 'visit', ['listing_view']); const clicks = sum(cur, 'visit', ['booking_click', 'website_click']);
  const subsTotal = subs.reduce((a, s) => a + s.n, 0);
  const Delta = ({ now, before }: { now: number; before: number }) => {
    if (!before) return <span className="text-xs text-slate-600">{now ? 'new this period' : '—'}</span>;
    const pct = Math.round(((now - before) / before) * 100); const I = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus;
    return <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${pct > 0 ? 'text-emerald-700' : pct < 0 ? 'text-red-700' : 'text-slate-600'}`}><I className="size-3.5" aria-hidden />{pct > 0 ? '+' : ''}{pct}% vs previous {days} days</span>;
  };
  return (
    <>
      <PageHeader title="Analytics" subtitle="First-party, cookieless interactions actually recorded by the platform (America/Phoenix days). No estimates or modelled conversions. Sessions, users and traffic sources come from GA4 once connected."
        actions={<>{[7, 30, 90].map((n) => <a key={n} href={`?days=${n}`} aria-current={n === days} className={`rounded-md px-3 py-1.5 text-sm ${n === days ? 'bg-slate-800 text-white' : 'bg-white ring-1 ring-slate-200'}`}>{n} days</a>)}
          <a href={`/api/admin/analytics.csv?days=${days}`} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"><Download className="size-4" aria-hidden />CSV</a></>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {KPIS.filter((k) => k.site === 'visit').map((k) => <div key={k.label} className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs text-slate-600">Visit · {k.label}</p><p className="mt-1 text-2xl font-semibold">{sum(cur, k.site, k.names).toLocaleString()}</p><Delta now={sum(cur, k.site, k.names)} before={sum(prev, k.site, k.names)} /></div>)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {KPIS.filter((k) => k.site === 'edo').map((k) => <div key={k.label} className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs text-slate-600">EDO · {k.label}</p><p className="mt-1 text-2xl font-semibold">{sum(cur, k.site, k.names).toLocaleString()}</p><Delta now={sum(cur, k.site, k.names)} before={sum(prev, k.site, k.names)} /></div>)}
        <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs text-slate-600">Form submissions (both)</p><p className="mt-1 text-2xl font-semibold">{subsTotal}</p><Delta now={subsTotal} before={subsPrev[0].n} /></div>
        <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs text-slate-600">Click-through: listing view → booking/website</p><p className="mt-1 text-2xl font-semibold">{lv ? `${Math.round((clicks / lv) * 100)}%` : '—'}</p><span className="text-xs text-slate-600">{clicks} clicks / {lv} views (recorded)</span></div>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title={`Visit Chandler · daily interactions (${days} days)`}><TrendChart data={series('visit')} label="Visit Chandler interactions" color="#214FA1" /></Card>
        <Card title={`Economic Development · daily interactions (${days} days)`}><TrendChart data={series('edo')} label="Economic Development interactions" color="#003C5C" /></Card>
        <Card title="Most viewed listings"><BarList unit="listing views" rows={topListings.map((r) => ({ label: r.name, n: r.n, href: `/admin/content/listings/${r.id}/` }))} /></Card>
        <Card title="Most viewed properties"><BarList unit="property views" rows={topProps.map((r) => ({ label: r.name, n: r.n, href: `/admin/content/properties/${r.id}/` }))} /></Card>
        <Card title="Pages with most interactions"><BarList unit="interactions" rows={topPaths.map((r) => ({ label: r.path ?? '', n: r.n }))} /></Card>
        <Card title="Submissions by type"><BarList unit="submissions" rows={subs.sort((a, b) => b.n - a.n).map((s) => ({ label: `${s.site === 'visit' ? 'Visit' : 'EDO'} · ${s.type.replace(/_/g, ' ')}`, n: s.n, href: `/admin/submissions/?type=${s.type}` }))} /></Card>
        <Card title="All recorded event types" className="xl:col-span-2"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-600"><tr><th className="py-2">Site</th><th>Event</th><th className="text-right">This period</th><th className="text-right">Previous</th></tr></thead>
          <tbody>{cur.sort((a, b) => b.n - a.n).map((r) => <tr key={r.site + r.name} className="border-t border-slate-100"><td className="py-1.5">{r.site}</td><td>{r.name.replace(/_/g, ' ')}</td><td className="text-right font-mono">{r.n}</td><td className="text-right font-mono text-slate-600">{prev.find((p) => p.site === r.site && p.name === r.name)?.n ?? 0}</td></tr>)}
            {!cur.length && <tr><td colSpan={4} className="py-6 text-center text-slate-600">No interactions recorded in this period yet.</td></tr>}</tbody></table></div></Card>
      </div>
    </>
  );
}
