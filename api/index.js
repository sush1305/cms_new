import express from 'express';
import cors from 'cors';

// Routes
import authRoutes from '../src/routes/auth';
import programRoutes from '../src/routes/programs';
import lessonRoutes from '../src/routes/lessons';
import userRoutes from '../src/routes/users';
import catalogRoutes from '../src/routes/catalog';
import topicsRoutes from '../src/routes/topics';
import assetsRoutes from '../src/routes/assets';

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3001',
    'http://localhost:3000',
    /\.vercel\.app$/
  ],
  credentials: true
}));
app.use(express.json());

// Health check
import { dbHealth } from '../src/db';

app.get('/api/health', async (req, res) => {
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/users', userRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/assets', assetsRoutes);

export default app;
