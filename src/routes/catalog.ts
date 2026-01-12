import express from 'express';
import { getProgramWithAssets, getPublishedProgramsCursor, getPublishedLessonById } from '../db';

const router = express.Router();

// Get published programs with cursor pagination and filtering
// Query params: limit, cursor, language, topic
router.get('/programs', async (req, res) => {
  try {
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const cursor = req.query.cursor as string | undefined;
    const language = req.query.language as string | undefined;
    const topic = req.query.topic as string | undefined;

    const { items, nextCursor } = await getPublishedProgramsCursor({ limit, cursor: cursor || null, language: language || null, topic: topic || null });

    // Cache for 60 seconds
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ items, nextCursor });
  } catch (error) {
    console.error('Get published programs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get program with assets by ID (public)
router.get('/programs/:id', async (req, res) => {
  try {
    const program = await getProgramWithAssets(req.params.id, true); // only published
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }
    res.set('Cache-Control', 'public, max-age=60');
    res.json(program);
  } catch (error) {
    console.error('Get program with assets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get published lesson by ID (public)
router.get('/lessons/:id', async (req, res) => {
  try {
    const lesson = await getPublishedLessonById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    res.set('Cache-Control', 'public, max-age=60');
    res.json(lesson);
  } catch (error) {
    console.error('Get published lesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
