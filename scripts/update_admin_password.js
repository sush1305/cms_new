const { Pool } = require('pg');
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query('UPDATE users SET password=$1 WHERE email=$2', [
      '$2b$10$BQkGSQJnCg.DVPRYrZlU.ub/6sZL3DuWsp7lYxox5k7Ctdkr/h2YW',
      'admin@chaishorts.com',
    ]);
    console.log('updated', res.rowCount);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
