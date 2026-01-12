const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://chaishorts:password123@localhost:5433/chaishorts_cms' });
  try {
    const res = await pool.query(
      `SELECT id, title, status, created_at, updated_at, published_at
       FROM programs
       WHERE id = '464c8f34-67f5-4c9e-98c6-c2ab0e621465'`
    );
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error querying DB:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
