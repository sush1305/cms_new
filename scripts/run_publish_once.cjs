const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://chaishorts:password123@localhost:5433/chaishorts_cms' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const scheduledRes = await client.query(`
      SELECT id, publish_at, term_id
      FROM lessons
      WHERE status = 'scheduled'
      AND publish_at <= NOW()
      FOR UPDATE SKIP LOCKED
    `);
    const lessons = scheduledRes.rows;
    console.log('Scheduled lessons found:', lessons.length);

    if (lessons.length > 0) {
      const ids = lessons.map(l => l.id);
      await client.query(`
        UPDATE lessons
        SET status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW()
        WHERE id = ANY($1::uuid[])
      `, [ids]);

      const termIds = [...new Set(lessons.map(l => l.term_id))];
      const progRes = await client.query(`
        SELECT DISTINCT p.id
        FROM programs p
        JOIN terms t ON t.program_id = p.id
        WHERE t.id = ANY($1)
      `, [termIds]);

      for (const row of progRes.rows) {
        const programId = row.id;
        const hasPublishedRes = await client.query(`
          SELECT EXISTS (
            SELECT 1 FROM lessons l JOIN terms t ON t.id = l.term_id WHERE t.program_id = $1 AND l.status = 'published'
          )
        `, [programId]);
        if (hasPublishedRes.rows[0].exists) {
          await client.query(`
            UPDATE programs
            SET status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW()
            WHERE id = $1 AND status != 'published'
          `, [programId]);
        }
      }
    }

    await client.query('COMMIT');
    console.log('Publish run complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Publish run failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
