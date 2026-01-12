import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { User, Program, Term, Lesson, Asset, Topic, Status } from '../types';
import { db as storeDb } from '../store';

export let isOffline = false;

export function setOffline(flag: boolean) {
  isOffline = flag;
}

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

// Ensure we trim the DATABASE_URL to avoid accidental trailing spaces causing connection issues
const connectionString = (process.env.DATABASE_URL || 'postgres://chaishorts:password123@localhost:5432/chaishorts_cms').trim();
const pool = new Pool({
  connectionString,
  // Add connection timeout and retry logic
  connectionTimeoutMillis: 5000,
  query_timeout: 10000,
});

async function ensureMigrationsTable(client: any) {
  await client.query(`CREATE TABLE IF NOT EXISTS migrations (id VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
}

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const id = file;
      const res = await client.query('SELECT 1 FROM migrations WHERE id = $1', [id]);
      if (res.rowCount > 0) {
        console.log(`Skipping already applied migration ${id}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`Applying migration ${id}...`);

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO migrations (id) VALUES ($1)', [id]);
        await client.query('COMMIT');
        console.log(`Applied ${id}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Failed to apply ${id}:`, err.message || err);
        throw err;
      }
    }

    console.log('All migrations applied');
  } finally {
    client.release();
  }
}

// Initialize database connection
export async function initDb() {
  if (!process.env.DATABASE_URL) {
    isOffline = true;
    console.log('Using offline mode with local storage');
    return;
  }

  // Retry database connection up to 10 times with 2 second intervals
  for (let i = 0; i < 10; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connected');

      // Run migrations on startup
      try {
        await runMigrations();
      } catch (err) {
        console.error('Migration failure:', err.message || err);
        throw err;
      }

      isOffline = false;
      return;
    } catch (error) {
      console.error(`Database connection attempt ${i + 1} failed:`, (error as Error).message);
      if (i < 9) {
        console.log('Retrying in 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  // If all retries failed, set offline mode
  console.error('Database connection failed after 10 attempts, using offline mode');
  isOffline = true;
  console.log('Using offline mode with local storage');
}

// Utility function to convert snake_case to camelCase
function camelCaseKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(camelCaseKeys);

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    // Skip timestamp fields so we can handle them separately
    if (['createdAt', 'updatedAt', 'publishedAt', 'created_at', 'updated_at', 'published_at'].includes(camelKey) || ['createdAt', 'updatedAt', 'publishedAt', 'created_at', 'updated_at', 'published_at'].includes(key)) {
      continue;
    }
    result[camelKey] = camelCaseKeys(value);
  }
  return result;
}

// User queries
export async function getUserByEmail(email: string): Promise<User | null> {
  if (isOffline) {
    return storeDb.getUserByEmail(email);
  }
  const result = await pool.query('SELECT id, username, email, password, role FROM users WHERE email = $1', [email]);
  return result.rows.length > 0 ? camelCaseKeys(result.rows[0]) : null;
}

export async function getUserById(id: string): Promise<User | null> {
  if (isOffline) {
    return storeDb.getUserById(id);
  }
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows.length > 0 ? camelCaseKeys(result.rows[0]) : null;
}

export async function createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
  if (isOffline) {
    return storeDb.createUser(user);
  }
  const result = await pool.query(
    'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
    [user.username, user.email, user.password, user.role]
  );
  return camelCaseKeys(result.rows[0]);
}

export async function getUsers(): Promise<User[]> {
  if (isOffline) {
    return storeDb.getUsers();
  }
  const result = await pool.query('SELECT * FROM users ORDER BY username');
  return result.rows.map(camelCaseKeys);
}

export async function getAllUsers(): Promise<User[]> {
  if (isOffline) {
    return storeDb.getUsers();
  }
  const result = await pool.query('SELECT * FROM users ORDER BY username');
  return result.rows.map(camelCaseKeys);
}

export async function updateUser(id: string, user: Partial<User>): Promise<User | null> {
  if (isOffline) {
    const existing = storeDb.getUserById(id);
    if (!existing) return null;
    const updated = { ...existing, ...user };
    storeDb.updateUser(updated);
    return updated;
  }
  const fields = Object.keys(user);
  const values = Object.values(user);
  const setClause = fields.map((field, index) => `${field.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${index + 2}`).join(', ');

  const result = await pool.query(
    `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows.length > 0 ? camelCaseKeys(result.rows[0]) : null;
}

export async function deleteUser(id: string): Promise<boolean> {
  if (isOffline) {
    storeDb.deleteUser(id);
    return true;
  }
  // Prevent deleting the last admin
  const adminRes = await pool.query("SELECT COUNT(*)::int as count FROM users WHERE role = 'admin'");
  const adminCount = parseInt(adminRes.rows[0].count, 10);

  const checkRes = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
  if (checkRes.rows.length === 0) return false;
  const userRole = checkRes.rows[0].role;

  if (userRole === 'admin' && adminCount <= 1) {
    throw new Error('Cannot delete the last admin user');
  }

  const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
  return result.rowCount > 0;
}

export async function changePassword(id: string, password: string): Promise<boolean> {
  if (isOffline) {
    const existing = storeDb.getUserById(id);
    if (!existing) return false;
    storeDb.updateUser({ ...existing, password });
    return true;
  }
  const result = await pool.query('UPDATE users SET password = $1 WHERE id = $2', [password, id]);
  return result.rowCount > 0;
}

// Topic queries
export async function getAllTopics(): Promise<Topic[]> {
  if (isOffline) {
    return storeDb.getTopics();
  }
  const result = await pool.query('SELECT * FROM topics ORDER BY name');
  return result.rows.map(camelCaseKeys);
}

export async function getTopicById(id: string): Promise<Topic | null> {
  const result = await pool.query('SELECT * FROM topics WHERE id = $1', [id]);
  return result.rows.length > 0 ? camelCaseKeys(result.rows[0]) : null;
}

// Program queries
export async function getPrograms(): Promise<Program[]> {
  if (isOffline) {
    return storeDb.getPrograms();
  }
  const result = await pool.query(`
    SELECT p.*, ARRAY_AGG(pt.topic_id) as topic_ids
    FROM programs p
    LEFT JOIN program_topics pt ON p.id = pt.program_id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `);
  return result.rows.map(row => ({
    ...camelCaseKeys(row),
    topicIds: row.topic_ids.filter((id: string | null) => id !== null)
  }));
}

export async function getAllPrograms(): Promise<Program[]> {
  return getPrograms();
}

export async function getProgramById(id: string): Promise<Program | null> {
  if (isOffline) {
    return storeDb.getProgram(id);
  }
  const result = await pool.query(`
    SELECT p.*, ARRAY_AGG(pt.topic_id) as topic_ids
    FROM programs p
    LEFT JOIN program_topics pt ON p.id = pt.program_id
    WHERE p.id = $1
    GROUP BY p.id
  `, [id]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    ...camelCaseKeys(row),
    topicIds: row.topic_ids.filter((id: string | null) => id !== null)
  };
}

export async function createProgram(program: Omit<Program, 'id' | 'created_at' | 'updated_at'>): Promise<Program> {
  if (isOffline) {
    return storeDb.createProgram(program);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Validate primary language exists in available languages
    if (!program.languages_available || !program.languages_available.includes(program.language_primary)) {
      throw new Error('Primary language must be one of the available languages');
    }

    // Do not allow manual publish on program creation; status must be draft or archived
    const statusToInsert = (program.status === Status.PUBLISHED) ? Status.DRAFT : program.status;

    const result = await client.query(
      'INSERT INTO programs (title, description, language_primary, languages_available, status, published_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [program.title, program.description, program.language_primary, program.languages_available, statusToInsert, program.published_at]
    );
    const newProgram = camelCaseKeys(result.rows[0]);

    // Insert program_topics
    if (program.topicIds && program.topicIds.length > 0) {
      const values = program.topicIds.map(topicId => `('${newProgram.id}', '${topicId}')`).join(', ');
      await client.query(`INSERT INTO program_topics (program_id, topic_id) VALUES ${values}`);
    }

    await client.query('COMMIT');
    return { ...newProgram, topicIds: program.topicIds || [] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateProgram(id: string, program: Partial<Program>): Promise<Program | null> {
  if (isOffline) {
    return storeDb.updateProgram(id, program);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update program
    const fields = Object.keys(program).filter(key => key !== 'topicIds');
    const values = Object.values(program).filter((_, index) => Object.keys(program)[index] !== 'topicIds');
    const setClause = fields.map((field, index) => `${field.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${index + 2}`).join(', ');

    // Prevent manual publishing via API: ignore attempts to set status to Status.PUBLISHED
    if ((program as any).status === Status.PUBLISHED) {
      throw new Error('Programs cannot be published manually. Programs auto-publish when lessons are published.');
    }

    const result = await client.query(
      `UPDATE programs SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    // Update program_topics if topicIds provided
    if (program.topicIds !== undefined) {
      await client.query('DELETE FROM program_topics WHERE program_id = $1', [id]);
      if (program.topicIds.length > 0) {
        const values = program.topicIds.map(topicId => `('${id}', '${topicId}')`).join(', ');
        await client.query(`INSERT INTO program_topics (program_id, topic_id) VALUES ${values}`);
      }
    }

    await client.query('COMMIT');
    return getProgramById(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteProgram(id: string): Promise<boolean> {
  if (isOffline) {
    return storeDb.deleteProgram(id);
  }
  const result = await pool.query('DELETE FROM programs WHERE id = $1', [id]);
  return result.rowCount > 0;
}

// Term queries
export async function getTerms(programId: string): Promise<Term[]> {
  if (isOffline) {
    return storeDb.getTerms(programId);
  }
  const result = await pool.query('SELECT * FROM terms WHERE program_id = $1 ORDER BY term_number', [programId]);
  return result.rows.map(camelCaseKeys);
}

export async function getTermsByProgramId(programId: string): Promise<Term[]> {
  if (isOffline) {
    return storeDb.getTerms(programId);
  }
  const result = await pool.query('SELECT * FROM terms WHERE program_id = $1 ORDER BY term_number', [programId]);
  return result.rows.map(camelCaseKeys);
}

export async function createTerm(term: Omit<Term, 'id' | 'created_at'>): Promise<Term> {
  if (isOffline) {
    return storeDb.createTerm(term as any);
  }
  const result = await pool.query(
    'INSERT INTO terms (program_id, term_number, title) VALUES ($1, $2, $3) RETURNING *',
    [term.program_id, term.term_number, term.title]
  );
  return camelCaseKeys(result.rows[0]);
}

export async function deleteTerm(id: string): Promise<boolean> {
  if (isOffline) {
    storeDb.deleteTerm(id);
    return true;
  }
  const result = await pool.query('DELETE FROM terms WHERE id = $1', [id]);
  return result.rowCount > 0;
}

// Lesson queries
export async function getLessonsByTermId(termId: string): Promise<Lesson[]> {
  if (isOffline) {
    return storeDb.getLessons(termId);
  }
  const result = await pool.query('SELECT * FROM lessons WHERE term_id = $1 ORDER BY lesson_number', [termId]);
  return result.rows.map(camelCaseKeys);
}

export async function getLessonById(id: string): Promise<Lesson | null> {
  if (isOffline) {
    return storeDb.getLesson(id) || null;
  }
  const result = await pool.query('SELECT * FROM lessons WHERE id = $1', [id]);
  return result.rows.length > 0 ? camelCaseKeys(result.rows[0]) : null;
}

export async function createLesson(lesson: Omit<Lesson, 'id' | 'created_at' | 'updated_at'>): Promise<Lesson> {
  if (isOffline) {
    return storeDb.createLesson(lesson as any);
  }
  const result = await pool.query(
    'INSERT INTO lessons (term_id, lesson_number, title, content_type, duration_ms, is_paid, content_language_primary, content_languages_available, content_urls_by_language, subtitle_languages, subtitle_urls_by_language, status, publish_at, published_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *',
    [lesson.term_id, lesson.lesson_number, lesson.title, lesson.content_type, lesson.duration_ms, lesson.is_paid, lesson.content_language_primary, lesson.content_languages_available, lesson.content_urls_by_language, lesson.subtitle_languages, lesson.subtitle_urls_by_language, lesson.status, lesson.publish_at, lesson.published_at]
  );
  return camelCaseKeys(result.rows[0]);
}

export async function updateLesson(id: string, lesson: Partial<Lesson>): Promise<Lesson | null> {
  if (isOffline) {
    const existing = storeDb.getLesson(id as any);
    if (!existing) return null;
    const updated = { ...existing, ...lesson } as any;
    storeDb.updateLesson(updated);
    return updated;
  }
  
  // Map camelCase field names to snake_case, deduplicate
  const snakeCaseFields: Record<string, any> = {};
  for (const [key, value] of Object.entries(lesson)) {
    // Skip undefined values and system-managed fields
    if (value === undefined) continue;
    
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    // Skip fields that shouldn't be updated directly
    if (snakeKey === 'id' || snakeKey === 'created_at' || snakeKey === 'updated_at') continue;
    
    snakeCaseFields[snakeKey] = value;
  }

  const fields = Object.keys(snakeCaseFields);
  const values = Object.values(snakeCaseFields);
  
  // If no fields to update, just return the existing lesson
  if (fields.length === 0) {
    const result = await pool.query('SELECT * FROM lessons WHERE id = $1', [id]);
    return result.rows.length > 0 ? camelCaseKeys(result.rows[0]) : null;
  }
  
  const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');

  const result = await pool.query(
    `UPDATE lessons SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows.length > 0 ? camelCaseKeys(result.rows[0]) : null;
}

export async function deleteLesson(id: string): Promise<boolean> {
  if (isOffline) {
    storeDb.deleteLesson(id);
    return true;
  }
  const result = await pool.query('DELETE FROM lessons WHERE id = $1', [id]);
  return result.rowCount > 0;
}

// Program & Lesson asset queries (normalized tables)
export async function getProgramAssets(programId: string) {
  if (isOffline) {
    return storeDb.getAssets(programId).filter((a: any) => a.asset_type === 'poster');
  }
  const result = await pool.query('SELECT * FROM program_assets WHERE program_id = $1', [programId]);
  return result.rows.map(camelCaseKeys);
}

export async function getLessonAssets(lessonId: string) {
  if (isOffline) {
    return storeDb.getAssets(lessonId).filter((a: any) => a.asset_type === 'thumbnail');
  }
  const result = await pool.query('SELECT * FROM lesson_assets WHERE lesson_id = $1', [lessonId]);
  return result.rows.map(camelCaseKeys);
}

// Generic asset helpers that unify program and lesson assets into a single API
export async function getAssetsByParentId(parentId: string) {
  if (isOffline) {
    return storeDb.getAssets(parentId).map((r: any) => ({
      id: r.id,
      parent_id: r.parent_id,
      language: r.language,
      variant: r.variant,
      asset_type: r.asset_type,
      url: r.url
    }));
  }
  const programRes = await pool.query('SELECT id, program_id as parent_id, language, variant, url FROM program_assets WHERE program_id = $1', [parentId]);
  const lessonRes = await pool.query('SELECT id, lesson_id as parent_id, language, variant, url FROM lesson_assets WHERE lesson_id = $1', [parentId]);
  const programRows = programRes.rows.map(r => ({
    ...camelCaseKeys(r),
    assetType: 'poster'
  }));
  const lessonRows = lessonRes.rows.map(r => ({
    ...camelCaseKeys(r),
    assetType: 'thumbnail'
  }));
  // Normalize to Asset interface
  return [...programRows, ...lessonRows].map(r => ({
    id: r.id,
    parent_id: r.parentId,
    language: r.language,
    variant: r.variant,
    asset_type: r.assetType,
    url: r.url
  }));
}

export async function createAsset(asset: { parent_id: string; language: string; variant: string; asset_type: string; url: string }) {
  if (isOffline) {
    // use unified upsert
    storeDb.upsertAsset(asset as any);
    const found = storeDb.getAssets(asset.parent_id).find((a: any) => a.language === asset.language && a.variant === asset.variant && a.asset_type === asset.asset_type);
    return found;
  }
  if (asset.asset_type === 'poster') {
    const result = await pool.query('INSERT INTO program_assets (program_id, language, variant, url) VALUES ($1, $2, $3, $4) RETURNING *', [asset.parent_id, asset.language, asset.variant, asset.url]);
    return camelCaseKeys(result.rows[0]);
  } else if (asset.asset_type === 'thumbnail') {
    const result = await pool.query('INSERT INTO lesson_assets (lesson_id, language, variant, url) VALUES ($1, $2, $3, $4) RETURNING *', [asset.parent_id, asset.language, asset.variant, asset.url]);
    return camelCaseKeys(result.rows[0]);
  }
  throw new Error('Unsupported asset_type');
}

export async function createProgramAsset(programId: string, language: string, variant: string, url: string) {
  if (isOffline) {
    storeDb.upsertAsset({ parent_id: programId, language, variant, asset_type: 'poster', url } as any);
    const found = storeDb.getAssets(programId).find((a: any) => a.language === language && a.variant === variant && a.asset_type === 'poster');
    return found;
  }
  const result = await pool.query(
    'INSERT INTO program_assets (program_id, language, variant, url) VALUES ($1, $2, $3, $4) RETURNING *',
    [programId, language, variant, url]
  );
  return camelCaseKeys(result.rows[0]);
}

export async function createLessonAsset(lessonId: string, language: string, variant: string, url: string) {
  if (isOffline) {
    storeDb.upsertAsset({ parent_id: lessonId, language, variant, asset_type: 'thumbnail', url } as any);
    const found = storeDb.getAssets(lessonId).find((a: any) => a.language === language && a.variant === variant && a.asset_type === 'thumbnail');
    return found;
  }
  const result = await pool.query(
    'INSERT INTO lesson_assets (lesson_id, language, variant, url) VALUES ($1, $2, $3, $4) RETURNING *',
    [lessonId, language, variant, url]
  );
  return camelCaseKeys(result.rows[0]);
}

// Worker queries
export async function getScheduledLessons(): Promise<Lesson[]> {
  if (isOffline) {
    // Not used in offline worker; the store's processScheduled handles this
    // fallback: collect from all terms
    const allPrograms = storeDb.getPrograms();
    const terms = allPrograms.flatMap(p => storeDb.getTerms(p.id));
    const lessons: Lesson[] = [] as any;
    for (const t of terms) {
      for (const l of storeDb.getLessons(t.id)) {
        if (l.status === Status.SCHEDULED && l.publish_at && new Date(l.publish_at) <= new Date()) lessons.push(l as any);
      }
    }
    return lessons;
  }
  const result = await pool.query('SELECT * FROM lessons WHERE status = $1 AND publish_at <= NOW()', [Status.SCHEDULED]);
  return result.rows.map(camelCaseKeys);
}

export async function publishLesson(id: string): Promise<boolean> {
  if (isOffline) {
    const existing = storeDb.getLesson(id as any);
    if (!existing) return false;
    if (existing.status === Status.PUBLISHED) return false;
    existing.status = Status.PUBLISHED;
    existing.published_at = existing.published_at || new Date().toISOString();
    storeDb.updateLesson(existing as any);
    return true;
  }
  // Idempotent publish: set published_at only if not already set
  const result = await pool.query(
    `UPDATE lessons SET status = $1, published_at = COALESCE(published_at, NOW()), updated_at = NOW() WHERE id = $2 AND status != $1`,
    [Status.PUBLISHED, id]
  );
  return result.rowCount > 0;
}

export async function publishProgramIfReady(id: string): Promise<boolean> {
  // Check if all lessons in the program are published
  const result = await pool.query(`
    SELECT p.id FROM programs p
    WHERE p.id = $1 AND NOT EXISTS (
      SELECT 1 FROM terms t
      JOIN lessons l ON t.id = l.term_id
      WHERE t.program_id = p.id AND l.status != 'published'
    )
  `, [id]);

  if (result.rows.length > 0) {
    await pool.query('UPDATE programs SET status = $1, published_at = COALESCE(published_at, NOW()), updated_at = NOW() WHERE id = $2 AND status != $1', [Status.PUBLISHED, id]);
    return true;
  }
  return false;
}

// Catalog queries
export async function getPublishedPrograms(): Promise<Program[]> {
  const result = await pool.query('SELECT * FROM programs WHERE status = $1 ORDER BY published_at DESC', [Status.PUBLISHED]);
  return result.rows.map(camelCaseKeys);
}

export async function getProgramWithAssets(id: string, onlyPublished = false): Promise<any> {
  const program = await getProgramById(id);
  if (!program) return null;
  if (onlyPublished && program.status !== Status.PUBLISHED) return null;

  const assets = await getProgramAssets(id);
  const topics = await Promise.all(program.topicIds.map(getTopicById));

  return {
    ...program,
    assets: {
      posters: assets.reduce((acc: Record<string, Record<string, string>>, asset: any) => {
        if (!acc[asset.language]) acc[asset.language] = {};
        acc[asset.language][asset.variant] = asset.url;
        return acc;
      }, {})
    },
    topics: topics.filter(t => t !== null).map((t: any) => t!.name)
  };
}

// Cursor-based published programs query with filters
export async function getPublishedProgramsCursor(opts: { limit?: number; cursor?: string | null; language?: string | null; topic?: string | null }) {
  const limit = Math.min(opts.limit || 20, 100);

  if (isOffline) {
    // Use in-memory store cursoring when offline
    let items = storeDb.getPrograms().filter((p: any) => p.status === Status.PUBLISHED);

    if (opts.language) {
      items = items.filter((p: any) => p.language_primary === opts.language || (p.languages_available || []).includes(opts.language));
    }

    if (opts.topic) {
      items = items.filter((p: any) => (p.topicIds || []).some((tid: string) => {
        const t = storeDb.getTopics().find((x: any) => x.id === tid);
        return t && t.name === opts.topic;
      }));
    }

    // Sort by published_at desc then id desc
    items = items.sort((a: any, b: any) => {
      const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
      const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return b.id.localeCompare(a.id);
    });

    // Apply cursor
    if (opts.cursor) {
      try {
        const decoded = Buffer.from(opts.cursor, 'base64').toString('utf8');
        const [published_at, id] = decoded.split('|');
        items = items.filter((p: any) => {
          if (!p.published_at) return false;
          if (p.published_at < published_at) return true;
          if (p.published_at === published_at && p.id < id) return true;
          return false;
        });
      } catch (e) {
        // ignore malformed cursor
      }
    }

    const page = items.slice(0, limit + 1);
    let nextCursor = null;
    if (page.length > limit) {
      const last = page[limit - 1];
      nextCursor = Buffer.from(`${last.published_at}|${last.id}`).toString('base64');
    }

    // Enrich offline data with assets and topics
    const enrichedItems = page.slice(0, limit).map((program: any) => {
      const assets = storeDb.getAssets(program.id).filter((a: any) => a.parent_id === program.id);
      const topics = program.topicIds.map((tid: string) => {
        const t = storeDb.getTopics().find((x: any) => x.id === tid);
        return t ? t.name : null;
      }).filter(Boolean);

      return {
        ...program,
        assets: {
          posters: assets.reduce((acc: Record<string, Record<string, string>>, asset: any) => {
            if (!acc[asset.language]) acc[asset.language] = {};
            acc[asset.language][asset.variant] = asset.url;
            return acc;
          }, {})
        },
        topics
      };
    });

    return { items: enrichedItems, nextCursor };
  }

  const params: any[] = [ Status.PUBLISHED ];
  let idx = 2;

  let whereClauses = ['p.status = $1'];

  if (opts.language) {
    whereClauses.push(`($${idx} = p.language_primary OR $${idx} = ANY(p.languages_available))`);
    params.push(opts.language);
    idx++;
  }

  if (opts.topic) {
    whereClauses.push(`EXISTS (SELECT 1 FROM program_topics pt JOIN topics t ON t.id = pt.topic_id WHERE pt.program_id = p.id AND t.name = $${idx})`);
    params.push(opts.topic);
    idx++;
  }

  // Cursor is base64 of published_at|id
  if (opts.cursor) {
    try {
      const decoded = Buffer.from(opts.cursor, 'base64').toString('utf8');
      const [published_at, id] = decoded.split('|');
      whereClauses.push(`(p.published_at < $${idx} OR (p.published_at = $${idx} AND p.id < $${idx + 1}))`);
      params.push(published_at);
      params.push(id);
      idx += 2;
    } catch (e) {
      // ignore malformed cursor
    }
  }

  const sql = `
    SELECT p.*, COALESCE(ARRAY_AGG(pt.topic_id) FILTER (WHERE pt.topic_id IS NOT NULL), '{}') as topic_ids
    FROM programs p
    LEFT JOIN program_topics pt ON p.id = pt.program_id
    WHERE ${whereClauses.join(' AND ')}
    GROUP BY p.id
    ORDER BY p.published_at DESC NULLS LAST, p.id DESC
    LIMIT $${idx}
  `;

  params.push(limit + 1);

  const result = await pool.query(sql, params);
  const rows = result.rows.map(row => {
    const camelized = camelCaseKeys(row);
    // Ensure all timestamp fields are ISO strings
    const createdAt = row.created_at ? (row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)) : null;
    const updatedAt = row.updated_at ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)) : null;
    const publishedAt = row.published_at ? (row.published_at instanceof Date ? row.published_at.toISOString() : String(row.published_at)) : null;
    
    return {
      ...camelized,
      topicIds: row.topic_ids || [],
      createdAt,
      updatedAt,
      publishedAt
    };
  });

  let nextCursor = null;
  if (rows.length > limit) {
    const last = rows[limit - 1];
    nextCursor = Buffer.from(`${last.publishedAt}|${last.id}`).toString('base64');
  }

  // Enrich with assets and topics
  const programs = await Promise.all(rows.slice(0, limit).map(async (program: any) => {
    const assets = await getProgramAssets(program.id);
    const topics = await Promise.all((program.topicIds || []).map(getTopicById));

    return {
      ...program,
      assets: {
        posters: assets.reduce((acc: Record<string, Record<string, string>>, asset: any) => {
          if (!acc[asset.language]) acc[asset.language] = {};
          acc[asset.language][asset.variant] = asset.url;
          return acc;
        }, {})
      },
      topics: topics.filter(t => t !== null).map((t: any) => t!.name)
    };
  }));

  return { items: programs, nextCursor };
}

export async function getPublishedLessonById(id: string) {
  const result = await pool.query('SELECT * FROM lessons WHERE id = $1 AND status = $2', [id, Status.PUBLISHED]);
  if (result.rows.length === 0) return null;
  const lesson = camelCaseKeys(result.rows[0]);
  const assets = await getLessonAssets(id);
  return { 
    ...lesson,
    assets: assets.reduce((acc: any, a: any) => {
      if (!acc[a.language]) acc[a.language] = {};
      acc[a.language][a.variant] = a.url;
      return acc;
    }, {}) 
  };
}

// Health check for DB connectivity
export async function dbHealth(): Promise<{ ok: boolean; error?: string }> {
  if (isOffline) return { ok: false, error: 'offline' };
  try {
    await pool.query('SELECT 1');
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || String(err) };
  }
}
