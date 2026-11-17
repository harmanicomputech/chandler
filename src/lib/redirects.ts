import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { permanentRedirect, redirect } from 'next/navigation';
import { db, schema } from '@/db';

/** Look up the redirect register; if matched, count the hit and redirect (301/308 or 302). */
export async function followRedirect(site: 'visit' | 'edo', path: string, prefix = '') {
  const variants = [path, path.endsWith('/') ? path.slice(0, -1) : path + '/'];
  const [r] = await db.select().from(schema.redirects).where(and(eq(schema.redirects.site, site), sql`${schema.redirects.fromPath} in (${sql.join(variants.map((v) => sql`${v}`), sql`, `)})`)).limit(1);
  if (!r) return;
  await db.update(schema.redirects).set({ hits: sql`${schema.redirects.hits} + 1` }).where(eq(schema.redirects.id, r.id));
  const to = /^https?:/.test(r.toPath) ? r.toPath : prefix + r.toPath;
  if (r.statusCode === 302 || r.statusCode === 307) redirect(to);
  permanentRedirect(to);
}
