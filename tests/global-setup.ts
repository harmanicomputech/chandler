import { Client } from 'pg';
/** Test-environment reset: clear rate-limit windows and make the fixture listings published again so runs are repeatable. */
export default async function globalSetup() {
  const db = new Client({ connectionString: process.env.DATABASE_URL ?? 'postgresql://chandler:chandler_dev@localhost:5432/chandler' });
  await db.connect();
  await db.query('delete from rate_limits');
  await db.query("update listings set status = 'published' where id in (4484, 164)");
  await db.query("update users set failed_logins = 0, locked_until = null");
  await db.end();
}
