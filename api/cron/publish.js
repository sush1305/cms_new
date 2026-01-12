import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  // Verify this is a cron request
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[Cron] Checking for scheduled lessons...');
    
    // Get all scheduled lessons that should be published
    const result = await pool.query(`
      SELECT * FROM lessons 
      WHERE status = 'scheduled' 
      AND publish_at <= NOW()
    `);

    let published = 0;
    let failed = 0;

    for (const lesson of result.rows) {
      try {
        await pool.query(`
          UPDATE lessons
          SET status = 'published',
              published_at = COALESCE(published_at, NOW()),
              updated_at = NOW()
          WHERE id = $1
        `, [lesson.id]);
        
        console.log(`[Cron] Published lesson ${lesson.id}`);
        published++;
      } catch (err) {
        console.error(`[Cron] Error publishing lesson ${lesson.id}:`, err.message);
        failed++;
      }
    }

    console.log(`[Cron] Auto-published ${published} lessons${failed > 0 ? `, ${failed} failed` : ''}`);
    
    res.json({
      success: true,
      published,
      failed,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cron] Error:', error);
    res.status(500).json({ error: 'Cron job failed' });
  }
}
