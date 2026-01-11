import express from 'express';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth';
import { getUsers, getUserById, createUser, updateUser, deleteUser, changePassword } from '../db';
import { Role } from '../../types';

const router = express.Router();

// Get all users (ADMIN only)
router.get('/', authenticateToken, requireRole(Role.ADMIN), async (req: AuthRequest, res) => {
  try {
    const users = await getUsers();
    // Remove password hashes from response
    const safeUsers = users.map(({ password, ...user }) => user);
    res.json(safeUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { password, ...safeUser } = req.user;
    res.json(safeUser);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user (ADMIN only)
router.post('/', authenticateToken, requireRole(Role.ADMIN), async (req: AuthRequest, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Store password in plain text
    const user = await createUser({
      username,
      email,
      password: password,
      role: role || Role.VIEWER
    });

    // Remove password from response
    const { password: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (error) {
    console.error('Create user error:', error);
    if (error.message.includes('already registered')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update user (ADMIN or self)
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Allow ADMIN to update any user, or users to update themselves
    if (req.user!.role !== Role.ADMIN && req.user!.id !== req.params.id) {
      return res.status(403).json({ error: 'Cannot update other users' });
    }

    const updateData = req.body;
    // Remove password from update data (handled separately)
    delete updateData.password;

    const user = await updateUser(req.params.id, updateData);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password from response
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password (ADMIN or self)
router.put('/:id/password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Allow ADMIN to change any password, or users to change their own
    if (req.user!.role !== Role.ADMIN && req.user!.id !== req.params.id) {
      return res.status(403).json({ error: 'Cannot change other users passwords' });
    }

    const { currentPassword, newPassword } = req.body;

    // Verify current password if not admin
    if (req.user!.role !== Role.ADMIN) {
      const user = await getUserById(req.params.id);
      if (!user || currentPassword !== user.password) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    // Store new password in plain text
    const success = await changePassword(req.params.id, newPassword);
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (ADMIN only, cannot delete self)
router.delete('/:id', authenticateToken, requireRole(Role.ADMIN), async (req: AuthRequest, res) => {
  try {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const success = await deleteUser(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
