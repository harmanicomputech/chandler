import { Client } from 'pg';
/** Remove all records created by the test suite so QA data never appears on the public sites. */
export default async function globalTeardown() {
  const db = new Client({ connectionString: process.env.DATABASE_URL ?? 'postgresql://chandler:chandler_dev@localhost:5432/chandler' });
  await db.connect();
  await db.query(`delete from content_versions where entity = 'pages' and entity_id in (select id from pages where path like '/qa-%')`);
  await db.query(`delete from pages where path like '/qa-%'`);
  await db.query(`delete from redirects where from_path like '/qa-%'`);
  await db.query(`delete from events where title like 'QA %'`);
  await db.query(`delete from submissions where email like 'qa%@example.com' or subject like 'QA %' or (payload->>'eventTitle') like 'QA %'`);
  await db.query(`delete from newsletter_subscribers where email like 'qa+%@example.com'`);
  await db.query(`delete from collections where title like 'QA %'`);
  await db.query(`delete from media where alt like 'QA upload%'`);
  await db.query(`update listings set owner_user_id = null where id = 164`);
  await db.end();
}
