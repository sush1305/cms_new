import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/chaishorts' });

async function ensureMigrationsTable(client:any) {
  await client.query(`CREATE TABLE IF NOT EXISTS migrations (id VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
}

async function run() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);

    const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const id = file;
      const res = await client.query('SELECT 1 FROM migrations WHERE id = $1', [id]);
      if (res.rowCount > 0) {
        console.log(`Skipping already applied migration ${id}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`Applying migration ${id}...`);

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO migrations (id) VALUES ($1)', [id]);
        await client.query('COMMIT');
        console.log(`Applied ${id}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Failed to apply ${id}:`, err);
        throw err;
      }
    }

    console.log('All migrations applied');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
