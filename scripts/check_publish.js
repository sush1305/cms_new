const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://chaishorts:password123@localhost:5433/chaishorts_cms' });
  try {
    const res = await pool.query(
      `SELECT l.id,l.status,l.publish_at,l.published_at,p.id as program_id,p.status as program_status,p.published_at as program_published_at
       FROM lessons l
       JOIN terms t ON l.term_id = t.id
       JOIN programs p ON t.program_id = p.id
       WHERE l.id = $1`,
      ['44444444-4444-4444-4444-444444444446']
    );
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error querying DB:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
