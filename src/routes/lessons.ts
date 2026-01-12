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

    // Validation
    if (lessonData.content_type === 'video' && !lessonData.duration_ms) {
      return res.status(400).json({ error: 'Video lessons require duration_ms' });
    }

    if (!lessonData.content_languages_available || !lessonData.content_languages_available.includes(lessonData.content_language_primary)) {
      return res.status(400).json({ error: 'Primary content language must be included in content_languages_available' });
    }

    if (lessonData.status === Status.SCHEDULED && !lessonData.publish_at) {
      return res.status(400).json({ error: 'Scheduled lessons must include publish_at' });
    }

    // Ensure lesson number is unique per term
    const existing = await getLessonsByTermId(lessonData.term_id);
    if (existing.some(l => l.lesson_number === lessonData.lesson_number)) {
      return res.status(409).json({ error: `Lesson number ${lessonData.lesson_number} already exists in this term` });
    }

    const lesson = await createLesson(lessonData);
    res.status(201).json(lesson);
  } catch (error) {
    console.error('Create lesson error:', error);
    if (error instanceof Error && error.message.includes('unique')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update lesson (EDITOR+)
router.put('/:id', authenticateToken, requireRole(Role.EDITOR), async (req: AuthRequest, res) => {
  try {
    const updateData = req.body;

    if (updateData.content_type === 'video' && !updateData.duration_ms) {
      return res.status(400).json({ error: 'Video lessons require duration_ms' });
    }

    if (updateData.content_languages_available && updateData.content_language_primary && !updateData.content_languages_available.includes(updateData.content_language_primary)) {
      return res.status(400).json({ error: 'Primary content language must be included in content_languages_available' });
    }

    if (updateData.status === Status.SCHEDULED && !updateData.publish_at) {
      return res.status(400).json({ error: 'Scheduled lessons must include publish_at' });
    }

    const lesson = await updateLesson(req.params.id, updateData);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    res.json(lesson);
  } catch (error) {
    console.error('Update lesson error:', error);
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
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
