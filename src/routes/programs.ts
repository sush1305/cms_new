import express from 'express';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth';
import {
  getPrograms,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram,
  getTerms,
  createTerm,
  deleteTerm
} from '../db';
import { Role, Status } from '../../types.js';

const router = express.Router();

// Get all programs (authenticated users)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const programs = await getPrograms();
    res.json(programs);
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get program by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const program = await getProgramById(req.params.id);
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }
    res.json(program);
  } catch (error) {
    console.error('Get program error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create program (EDITOR+)
router.post('/', authenticateToken, requireRole(Role.EDITOR), async (req: AuthRequest, res) => {
  try {
    const programData = req.body;
    const program = await createProgram(programData);
    res.status(201).json(program);
  } catch (error) {
    console.error('Create program error:', error);
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      if (error.message.includes('Primary language') || error.message.includes('cannot be published')) {
        return res.status(400).json({ error: error.message });
      }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update program (EDITOR+)
router.put('/:id', authenticateToken, requireRole(Role.EDITOR), async (req: AuthRequest, res) => {
  try {
    const program = await updateProgram(req.params.id, req.body);
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }
    res.json(program);
  } catch (error) {
    console.error('Update program error:', error);
    if (error instanceof Error && error.message.includes('cannot be published')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete program (EDITOR+)
router.delete('/:id', authenticateToken, requireRole(Role.EDITOR), async (req: AuthRequest, res) => {
  try {
    const success = await deleteProgram(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Program not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Delete program error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get terms for a program
router.get('/:id/terms', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const terms = await getTerms(req.params.id);
    res.json(terms);
  } catch (error) {
    console.error('Get terms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create term (EDITOR+)
router.post('/:id/terms', authenticateToken, requireRole(Role.EDITOR), async (req: AuthRequest, res) => {
  try {
    const { term_number, title } = req.body;
    const term = await createTerm({
      program_id: req.params.id,
      term_number,
      title
    });
    res.status(201).json(term);
  } catch (error) {
    console.error('Create term error:', error);
    if (error.message.includes('already exists')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete term (EDITOR+)
router.delete('/:id/terms/:termId', authenticateToken, requireRole(Role.EDITOR), async (req: AuthRequest, res) => {
  try {
    const success = await deleteTerm(req.params.termId);
    if (!success) {
      return res.status(404).json({ error: 'Term not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Delete term error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
