import express from 'express';
import { getAllTopics } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Return list of topics (authenticated)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const topics = await getAllTopics();
    res.json(topics);
  } catch (err) {
    console.error('Get topics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
