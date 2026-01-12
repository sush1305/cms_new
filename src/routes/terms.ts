import express from 'express';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth';
import { getLessonsByTermId, createLesson, deleteLesson } from '../db';
import { Role } from '../../types';

const router = express.Router();

// Get lessons for a term (authenticated)
router.get('/:termId/lessons', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const lessons = await getLessonsByTermId(req.params.termId);
    res.json(lessons);
  } catch (error) {
    console.error('Get lessons by term error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create lesson under term (EDITOR+)
router.post('/:termId/lessons', authenticateToken, requireRole(Role.EDITOR), async (req: AuthRequest, res) => {
  try {
    const lessonData = { ...req.body, term_id: req.params.termId };

    // Basic validation to mirror lessons route
    if (lessonData.content_type === 'video' && (lessonData.duration_ms === null || lessonData.duration_ms === undefined || lessonData.duration_ms < 0)) {
      console.error('Validation failed: duration_ms', lessonData.duration_ms);
      return res.status(400).json({ error: 'Video lessons require positive duration_ms' });
    }

    if (!lessonData.content_languages_available || !Array.isArray(lessonData.content_languages_available)) {
      console.error('Validation failed: content_languages_available not an array', lessonData.content_languages_available);
      return res.status(400).json({ error: 'content_languages_available must be an array' });
    }

    if (!lessonData.content_language_primary) {
      console.error('Validation failed: missing content_language_primary');
      return res.status(400).json({ error: 'content_language_primary is required' });
    }

    if (!lessonData.content_languages_available.includes(lessonData.content_language_primary)) {
      console.error('Validation failed: Primary language not in available languages', {
        primary: lessonData.content_language_primary,
        available: lessonData.content_languages_available
      });
      return res.status(400).json({ error: 'Primary content language must be included in content_languages_available' });
    }

    if (lessonData.status === 'scheduled' && !lessonData.publish_at) {
      return res.status(400).json({ error: 'Scheduled lessons must include publish_at' });
    }

    const lessons = await getLessonsByTermId(req.params.termId);
    if (lessons.some(l => l.lesson_number === lessonData.lesson_number)) {
      return res.status(409).json({ error: `Lesson number ${lessonData.lesson_number} already exists in this term` });
    }

    const lesson = await createLesson(lessonData);
    res.status(201).json(lesson);
  } catch (error: any) {
    console.error('Create lesson by term error:', error);
    if (error.message && error.message.includes('unique')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete lesson under term (EDITOR+)
router.delete('/:termId/lessons/:id', authenticateToken, requireRole(Role.EDITOR), async (req: AuthRequest, res) => {
  try {
    const success = await deleteLesson(req.params.id);
    if (!success) return res.status(404).json({ error: 'Lesson not found' });
    res.status(204).send();
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
