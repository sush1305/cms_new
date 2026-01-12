const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_M3HuFrKOXyp5@ep-cold-flower-ahrr2s4n-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({ connectionString });

(async () => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful!');
    console.log('Current database time:', result.rows[0].current_time);
    
    // Check if programs table exists and has data
    const programsCheck = await pool.query('SELECT COUNT(*) as count FROM programs WHERE status = \'published\'');
    console.log('Published programs in database:', programsCheck.rows[0].count);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
