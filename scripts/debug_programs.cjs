const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://chaishorts:password123@localhost:5433/chaishorts_cms' });
  try {
    const res = await pool.query(
      `SELECT id, title, status, created_at, updated_at, published_at
       FROM programs
       WHERE status = 'published'
       LIMIT 5`
    );
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error querying DB:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
