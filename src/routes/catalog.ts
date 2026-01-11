import express from 'express';
import { getPublishedPrograms, getProgramWithAssets } from '../db';

const router = express.Router();

// Get all published programs (public)
router.get('/programs', async (req, res) => {
  try {
    const programs = await getPublishedPrograms();
    res.json(programs);
  } catch (error) {
    console.error('Get published programs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get program with assets by ID (public)
router.get('/programs/:id', async (req, res) => {
  try {
    const program = await getProgramWithAssets(req.params.id);
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }
    res.json(program);
  } catch (error) {
    console.error('Get program with assets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
