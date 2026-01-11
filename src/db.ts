import { Pool } from 'pg';
import { User, Program, Term, Lesson, Asset, Topic } from '../types';
import { db as storeDb } from '../store';

export let isOffline = false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://chaishorts:password123@localhost:5432/chaishorts_cms',
  // Add connection timeout and retry logic
  connectionTimeoutMillis: 5000,
  query_timeout: 10000,
});

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
      isOffline = false;
      return;
    } catch (error) {
      console.error(`Database connection attempt ${i + 1} failed:`, error.message);
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
  if (Array.isArray(obj)) return obj.map(camelCaseKeys);

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
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
  const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
  return result.rowCount > 0;
}

export async function changePassword(id: string, password: string): Promise<boolean> {
  const result = await pool.query('UPDATE users SET password = $1 WHERE id = $2', [password, id]);
  return result.rowCount > 0;
}

// Topic queries
export async function getAllTopics(): Promise<Topic[]> {
  const result = await pool.query('SELECT * FROM topics ORDER BY name');
  return result.rows.map(camelCaseKeys);
}

export async function getTopicById(id: string): Promise<Topic | null> {
  const result = await pool.query('SELECT * FROM topics WHERE id = $1', [id]);
  return result.rows.length > 0 ? camelCaseKeys(result.rows[0]) : null;
}

// Program queries
export async function getPrograms(): Promise<Program[]> {
  const result = await pool.query('SELECT * FROM programs ORDER BY created_at DESC');
  return result.rows.map(camelCaseKeys);
}

export async function getAllPrograms(): Promise<Program[]> {
  const result = await pool.query('SELECT * FROM programs ORDER BY created_at DESC');
  return result.rows.map(camelCaseKeys);
}

export async function getProgramById(id: string): Promise<Program | null> {
  const result = await pool.query('SELECT * FROM programs WHERE id = $1', [id]);
  return result.rows.length > 0 ? camelCaseKeys(result.rows[0]) : null;
}

export async function createProgram(program: Omit<Program, 'id' | 'created_at' | 'updated_at'>): Promise<Program> {
  const result = await pool.query(
    'INSERT INTO programs (title, description, language_primary, languages_available, status, published_at, topic_ids) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [program.title, program.description, program.language_primary, program.languages_available, program.status, program.published_at, program.topic_ids]
  );
  return camelCaseKeys(result.rows[0]);
}

export async function updateProgram(id: string, program: Partial<Program>): Promise<Program | null> {
  const fields = Object.keys(program);
  const values = Object.values(program);
  const setClause = fields.map((field, index) => `${field.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${index + 2}`).join(', ');

  const result = await pool.query(
    `UPDATE programs SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows.length > 0 ? camelCaseKeys(result.rows[0]) : null;
}

export async function deleteProgram(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM programs WHERE id = $1', [id]);
  return result.rowCount > 0;
}

// Term queries
export async function getTerms(programId: string): Promise<Term[]> {
  const result = await pool.query('SELECT * FROM terms WHERE program_id = $1 ORDER BY term_number', [programId]);
  return result.rows.map(camelCaseKeys);
}

export async function getTermsByProgramId(programId: string): Promise<Term[]> {
  const result = await pool.query('SELECT * FROM terms WHERE program_id = $1 ORDER BY term_number', [programId]);
  return result.rows.map(camelCaseKeys);
}

export async function createTerm(term: Omit<Term, 'id' | 'created_at'>): Promise<Term> {
  const result = await pool.query(
    'INSERT INTO terms (program_id, term_number, title) VALUES ($1, $2, $3) RETURNING *',
    [term.program_id, term.term_number, term.title]
  );
  return camelCaseKeys(result.rows[0]);
}

export async function deleteTerm(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM terms WHERE id = $1', [id]);
  return result.rowCount > 0;
}

// Lesson queries
export async function getLessonsByTermId(termId: string): Promise<Lesson[]> {
  const result = await pool.query('SELECT * FROM lessons WHERE term_id = $1 ORDER BY lesson_number', [termId]);
  return result.rows.map(camelCaseKeys);
}

export async function getLessonById(id: string): Promise<Lesson | null> {
  const result = await pool.query('SELECT * FROM lessons WHERE id = $1', [id]);
  return result.rows.length > 0 ? camelCaseKeys(result.rows[0]) : null;
}

export async function createLesson(lesson: Omit<Lesson, 'id' | 'created_at' | 'updated_at'>): Promise<Lesson> {
  const result = await pool.query(
    'INSERT INTO lessons (term_id, lesson_number, title, content_type, duration_ms, is_paid, content_language_primary, content_languages_available, content_urls_by_language, subtitle_languages, subtitle_urls_by_language, status, publish_at, published_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *',
    [lesson.term_id, lesson.lesson_number, lesson.title, lesson.content_type, lesson.duration_ms, lesson.is_paid, lesson.content_language_primary, lesson.content_languages_available, lesson.content_urls_by_language, lesson.subtitle_languages, lesson.subtitle_urls_by_language, lesson.status, lesson.publish_at, lesson.published_at]
  );
  return camelCaseKeys(result.rows[0]);
}

export async function updateLesson(id: string, lesson: Partial<Lesson>): Promise<Lesson | null> {
  const fields = Object.keys(lesson);
  const values = Object.values(lesson);
  const setClause = fields.map((field, index) => `${field.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${index + 2}`).join(', ');

  const result = await pool.query(
    `UPDATE lessons SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows.length > 0 ? camelCaseKeys(result.rows[0]) : null;
}

export async function deleteLesson(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM lessons WHERE id = $1', [id]);
  return result.rowCount > 0;
}

// Asset queries
export async function getAssetsByParentId(parentId: string): Promise<Asset[]> {
  const result = await pool.query('SELECT * FROM assets WHERE parent_id = $1', [parentId]);
  return result.rows.map(camelCaseKeys);
}

export async function createAsset(asset: Omit<Asset, 'id'>): Promise<Asset> {
  const result = await pool.query(
    'INSERT INTO assets (parent_id, language, variant, asset_type, url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [asset.parent_id, asset.language, asset.variant, asset.asset_type, asset.url]
  );
  return camelCaseKeys(result.rows[0]);
}

// Worker queries
export async function getScheduledLessons(): Promise<Lesson[]> {
  const result = await pool.query('SELECT * FROM lessons WHERE status = $1 AND publish_at <= NOW()', ['scheduled']);
  return result.rows.map(camelCaseKeys);
}

export async function publishLesson(id: string): Promise<boolean> {
  const result = await pool.query(
    'UPDATE lessons SET status = $1, published_at = NOW() WHERE id = $2',
    ['published', id]
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
    await pool.query('UPDATE programs SET status = $1, published_at = NOW() WHERE id = $2', ['published', id]);
    return true;
  }
  return false;
}

// Catalog queries
export async function getPublishedPrograms(): Promise<Program[]> {
  const result = await pool.query('SELECT * FROM programs WHERE status = $1 ORDER BY published_at DESC', ['published']);
  return result.rows.map(camelCaseKeys);
}

export async function getProgramWithAssets(id: string): Promise<any> {
  const program = await getProgramById(id);
  if (!program) return null;

  const assets = await getAssetsByParentId(id);
  const topics = await Promise.all(program.topic_ids.map(getTopicById));

  return {
    ...program,
    assets: {
      posters: assets
        .filter(a => a.asset_type === 'poster')
        .reduce((acc, asset) => {
          if (!acc[asset.language]) acc[asset.language] = {};
          acc[asset.language][asset.variant] = asset.url;
          return acc;
        }, {} as Record<string, Record<string, string>>)
    },
    topics: topics.filter(t => t !== null).map(t => t!.name)
  };
}
