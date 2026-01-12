const bcrypt = require('bcrypt');
const { Pool } = require('pg');
(async () => {
  const pw = 'admin123';
  const saltRounds = 10;
  const hash = await bcrypt.hash(pw, saltRounds);
  console.log('generated hash:', hash);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query('UPDATE users SET password=$1 WHERE email=$2', [hash, 'admin@chaishorts.com']);
    console.log('updated rows:', res.rowCount);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
