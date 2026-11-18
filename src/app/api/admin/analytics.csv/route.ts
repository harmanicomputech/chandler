import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { getSessionUser, can } from '@/lib/auth';
/** Daily counts per site & event type (America/Phoenix days) for the selected period. */
export async function GET(req: Request) {
  const u = await getSessionUser(); if (!can(u, 'submissions.view')) return new Response('Unauthorized', { status: 401 });
  const d = Number(new URL(req.url).searchParams.get('days')); const days = [7, 30, 90].includes(d) ? d : 30;
  const r = await db.execute<{ day: string; site: string; name: string; n: number }>(sql`select to_char(date_trunc('day', created_at at time zone 'America/Phoenix'), 'YYYY-MM-DD') as day, site::text as site, name, count(*)::int as n
    from analytics_events where created_at at time zone 'America/Phoenix' >= date_trunc('day', now() at time zone 'America/Phoenix') - make_interval(days => ${days - 1}) group by 1, 2, 3 order by 1, 2, 3`);
  return new Response(['day,site,event,count', ...r.rows.map((x) => `${x.day},${x.site},${x.name},${x.n}`)].join('\n'), { headers: { 'content-type': 'text/csv', 'content-disposition': `attachment; filename="analytics-${days}d.csv"` } });
}
