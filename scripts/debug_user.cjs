const { Pool } = require('pg');
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://chaishorts:password123@localhost:5433/chaishorts_cms' });
  try {
    const res = await pool.query('SELECT id,username,email,password,role FROM users WHERE email=$1', ['admin@chaishorts.com']);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error querying user:', err);
  } finally {
    await pool.end();
  }
})();
