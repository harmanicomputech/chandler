import 'server-only';
import { sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import crypto from 'node:crypto';
import { db } from '@/db';

/** Fixed-window limiter stored in Postgres so it holds across multiple app instances. */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number): Promise<{ ok: boolean; remaining: number }> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local';
  const key = `${bucket}:${crypto.createHash('sha256').update(ip + (process.env.RATE_LIMIT_SALT ?? '')).digest('hex').slice(0, 32)}`;
  const res = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limits (key, count, window_start) VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) THEN now() ELSE rate_limits.window_start END
    RETURNING count`);
  const count = Number(res.rows[0]?.count ?? 1);
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}

export async function clientIp() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
}
