import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db';

// Routes
import authRoutes from './routes/auth';
import programRoutes from './routes/programs';
import lessonRoutes from './routes/lessons';
import userRoutes from './routes/users';
import catalogRoutes from './routes/catalog';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
  try {
    // TODO: Add database health check
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
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
    await initDb();
    console.log('Database connected successfully');
  } catch (error) {
    console.warn('Database connection failed, starting server in offline mode:', error.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
