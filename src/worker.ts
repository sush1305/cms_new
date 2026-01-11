import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

interface ScheduledLesson {
  id: string;
  publish_at: string;
  term_id: string;
}

// Process scheduled lessons
async function processScheduledLessons() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get lessons that are scheduled and ready to publish
    const scheduledQuery = `
      SELECT id, publish_at, term_id
      FROM lessons
      WHERE status = 'scheduled'
      AND publish_at <= NOW()
      FOR UPDATE
    `;
    const scheduledResult = await client.query(scheduledQuery);
    const scheduledLessons: ScheduledLesson[] = scheduledResult.rows;

    if (scheduledLessons.length === 0) {
      await client.query('COMMIT');
      return;
    }

    // Update lessons to published status
    const lessonIds = scheduledLessons.map(l => l.id);
    await client.query(`
      UPDATE lessons
      SET status = 'published',
          published_at = NOW(),
          updated_at = NOW()
      WHERE id = ANY($1)
    `, [lessonIds]);

    // Auto-publish programs if they have published lessons
    const termIds = [...new Set(scheduledLessons.map(l => l.term_id))];
    const programIdsResult = await client.query(`
      SELECT DISTINCT p.id
      FROM programs p
      JOIN terms t ON t.program_id = p.id
      WHERE t.id = ANY($1)
    `, [termIds]);

    for (const programRow of programIdsResult.rows) {
      const programId = programRow.id;

      // Check if program has any published lessons
      const hasPublishedResult = await client.query(`
        SELECT EXISTS (
          SELECT 1
          FROM lessons l
          JOIN terms t ON t.id = l.term_id
          WHERE t.program_id = $1
          AND l.status = 'published'
        )
      `, [programId]);

      const hasPublished = hasPublishedResult.rows[0].exists;

      if (hasPublished) {
        await client.query(`
          UPDATE programs
          SET status = 'published',
              published_at = COALESCE(published_at, NOW()),
              updated_at = NOW()
          WHERE id = $1
          AND status != 'published'
        `, [programId]);
      }
    }

    await client.query('COMMIT');
    console.log(`[Worker] Auto-published ${scheduledLessons.length} lessons`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Worker] Error processing scheduled lessons:', error);
  } finally {
    client.release();
  }
}

// Health check
async function healthCheck() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return { status: 'OK', database: 'Connected', timestamp: new Date().toISOString() };
  } catch (error) {
    console.error('[Worker] Health check failed:', error);
    return { status: 'ERROR', database: 'Disconnected', timestamp: new Date().toISOString() };
  }
}

// Main worker loop
async function startWorker() {
  console.log('[Worker] Starting background worker...');

  // Initial health check
  const health = await healthCheck();
  console.log('[Worker] Health check:', health);

  // Process scheduled lessons every 15 seconds (same as frontend simulation)
  setInterval(async () => {
    try {
      await processScheduledLessons();
    } catch (error) {
      console.error('[Worker] Error in main loop:', error);
    }
  }, 15000);

  console.log('[Worker] Worker started successfully');
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Worker] Shutting down...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down...');
  await pool.end();
  process.exit(0);
});

startWorker();
