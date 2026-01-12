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
    // Get lessons that are scheduled and ready to publish (without transaction)
    const scheduledQuery = `
      SELECT id, publish_at, term_id
      FROM lessons
      WHERE status = 'scheduled'
      AND publish_at <= NOW()
      ORDER BY publish_at ASC
    `;
    const scheduledResult = await client.query(scheduledQuery);
    const scheduledLessons: ScheduledLesson[] = scheduledResult.rows;

    if (scheduledLessons.length === 0) {
      return;
    }

    const successfulLessons = [];
    const failedLessons = [];

    // Process each lesson independently with its own transaction
    for (const lesson of scheduledLessons) {
      const lessonClient = await pool.connect();
      try {
        await lessonClient.query('BEGIN');

        // Try to publish this lesson
        await lessonClient.query(`
          UPDATE lessons
          SET status = 'published',
              published_at = COALESCE(published_at, NOW()),
              updated_at = NOW()
          WHERE id = $1
        `, [lesson.id]);

        await lessonClient.query('COMMIT');
        successfulLessons.push(lesson);
        console.log(`[Worker] Published lesson ${lesson.id}`);
      } catch (error: any) {
        await lessonClient.query('ROLLBACK');
        // Log the error but continue with other lessons
        if (error.message && error.message.includes('thumbnail')) {
          console.warn(`[Worker] Lesson ${lesson.id} cannot publish - missing thumbnails`);
        } else {
          console.error(`[Worker] Error publishing lesson ${lesson.id}:`, error.message);
        }
        failedLessons.push(lesson);
      } finally {
        lessonClient.release();
      }
    }

    // Auto-publish programs for successfully published lessons (each in its own transaction)
    for (const lesson of successfulLessons) {
      const programClient = await pool.connect();
      try {
        await programClient.query('BEGIN');

        // Get the program for this lesson
        const programResult = await programClient.query(`
          SELECT p.id
          FROM programs p
          JOIN terms t ON t.program_id = p.id
          WHERE t.id = $1
          LIMIT 1
        `, [lesson.term_id]);

        if (programResult.rows.length > 0) {
          const programId = programResult.rows[0].id;

          // Check if program has any published lessons
          const hasPublishedResult = await programClient.query(`
            SELECT EXISTS (
              SELECT 1
              FROM lessons l
              JOIN terms t ON t.id = l.term_id
              WHERE t.program_id = $1
              AND l.status = 'published'
            )
          `, [programId]);

          if (hasPublishedResult.rows[0].exists) {
            await programClient.query(`
              UPDATE programs
              SET status = 'published',
                  published_at = COALESCE(published_at, NOW()),
                  updated_at = NOW()
              WHERE id = $1
              AND status != 'published'
            `, [programId]);
          }
        }

        await programClient.query('COMMIT');
      } catch (error: any) {
        await programClient.query('ROLLBACK');
        console.error(`[Worker] Error auto-publishing program for lesson ${lesson.id}:`, error.message);
      } finally {
        programClient.release();
      }
    }

    console.log(`[Worker] Auto-published ${successfulLessons.length} lessons${failedLessons.length > 0 ? `, ${failedLessons.length} failed (likely missing thumbnails)` : ''}`);
  } catch (error) {
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

  // Run migrations if DB is available
  try {
    const { runMigrations } = await import('./db');
    await runMigrations();
  } catch (err) {
    console.warn('[Worker] Skipping migrations (DB may be unavailable):', err?.message || err);
  }

  // Process scheduled lessons every 60 seconds as required by the spec
  setInterval(async () => {
    try {
      await processScheduledLessons();
    } catch (error) {
      console.error('[Worker] Error in main loop:', error);
    }
  }, 60 * 1000);

  console.log('[Worker] Worker started successfully (interval: 60s)');
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
