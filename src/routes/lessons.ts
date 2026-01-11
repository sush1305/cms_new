import express from 'express';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth.js';
import {
  getLessonsByTermId,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson
} from '../db.js';
import { Role, Status } from '../../types';

const router = express.Router();

// Get lessons by term ID
router.get('/term/:termId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const lessons = await getLessonsByTermId(req.params.termId);
    res.json(lessons);
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get lesson by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const lesson = await getLessonById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    res.json(lesson);
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create lesson (EDITOR+)
router.post('/', authenticateToken, requireRole(Role.EDITOR), async (req: AuthRequest, res) => {
  try {
    const lessonData = req.body;
    const lesson = await createLesson(lessonData);
    res.status(201).json(lesson);
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update lesson (EDITOR+)
router.put('/:id', authenticateToken, requireRole(Role.EDITOR), async (req: AuthRequest, res) => {
  try {
    const lesson = await updateLesson(req.params.id, req.body);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    res.json(lesson);
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete lesson (EDITOR+)
router.delete('/:id', authenticateToken, requireRole(Role.EDITOR), async (req: AuthRequest, res) => {
  try {
    const success = await deleteLesson(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
