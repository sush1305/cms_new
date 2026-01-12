import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const seedFile = path.join(process.cwd(), 'seed.sql');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/chaishorts' });

async function run() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(seedFile, 'utf8');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Seed applied');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
