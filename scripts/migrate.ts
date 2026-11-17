import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://chandler:chandler_dev@localhost:5432/chandler' });
await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
console.log('migrations applied');
await pool.end();
