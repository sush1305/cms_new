import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

// Routes
import authRoutes from './routes/auth';
import programRoutes from './routes/programs';
import lessonRoutes from './routes/lessons';
import userRoutes from './routes/users';
import catalogRoutes from './routes/catalog';
import topicsRoutes from './routes/topics';
import assetsRoutes from './routes/assets';

dotenv.config();

// Auto-run migrations on startup
async function runMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Ensure migrations table exists
    await client.query(`CREATE TABLE IF NOT EXISTS migrations (id VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    
    const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');
    const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
    
    for (const file of files) {
      const id = file;
      const res = await client.query('SELECT 1 FROM migrations WHERE id = $1', [id]);
      if (res.rowCount > 0) {
        console.log(`[Migration] Skipping ${id} (already applied)`);
        continue;
      }
      
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`[Migration] Applying ${id}...`);
      
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO migrations (id) VALUES ($1)', [id]);
        await client.query('COMMIT');
        console.log(`[Migration] Applied ${id} ✓`);
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(`[Migration] Failed to apply ${id}:`, err.message);
        throw err;
      }
    }
    
    console.log('[Migration] All migrations applied successfully ✓');
  } finally {
    client.release();
    await pool.end();
  }
}

const app = express();
// Allow tests to override port using TEST_PORT to avoid dotenv or environment conflicts
const PORT = process.env.TEST_PORT || process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3001',
    'http://localhost:3000',
    /\.vercel\.app$/,  // Allow all Vercel preview/production domains
    /\.railway\.app$/  // Allow Railway domains
  ],
  credentials: true
}));
app.use(express.json());

// Structured request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    }));
  });
  next();
});

// Health check
import { dbHealth } from './db';

app.get('/health', async (req, res) => {
  try {
    const db = await dbHealth();
    res.json({
      status: db.ok ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      db
    });
  } catch (error) {
    res.status(500).json({ error: 'Health check failed' });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/users', userRoutes);

// Public Catalog API (no auth required)
app.use('/api/catalog', catalogRoutes);

// Topics (authenticated)
app.use('/api/topics', topicsRoutes);

// Assets (program & lesson assets)
app.use('/api/assets', assetsRoutes);

// Terms & term-scoped lesson routes
import termsRoutes from './routes/terms';
app.use('/api/terms', termsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('[Server] Running migrations...');
    await runMigrations();
    
    console.log('[Server] Initializing database connection...');
    await initDb();
    console.log('[Server] Database connected successfully ✓');
  } catch (error: any) {
    console.warn('[Server] Database connection failed:', error.message);
  }

  app.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT} ✓`);
  });
}

startServer();
