import { db, schema } from '@/db';
import { getSessionUser, can } from '@/lib/auth';
export async function GET() {
  const u = await getSessionUser(); if (!can(u, 'redirects.manage')) return new Response('Unauthorized', { status: 401 });
  const rows = await db.select().from(schema.redirects);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return new Response(['site,from_path,to_path,status_code,hits,note', ...rows.map((r) => [r.site, r.fromPath, r.toPath, r.statusCode, r.hits, r.note].map(esc).join(','))].join('\n'), { headers: { 'content-type': 'text/csv', 'content-disposition': 'attachment; filename="redirects.csv"' } });
}
