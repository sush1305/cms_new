import express from 'express';
import { generateToken } from '../middleware/auth';
import { getUserByEmail, initDb, isOffline } from '../db';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      console.log('login: user not found', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password - handle both offline (plain text) and online (hashed) modes
    let isValidPassword = false;
    if (isOffline) {
      // In offline mode, passwords are stored in plain text
      isValidPassword = password === user.password;
      console.log('login attempt (offline):', email, 'password match:', isValidPassword);
    } else {
      // In online mode, passwords are hashed with bcrypt. Use native bcrypt if available,
      // otherwise fall back to bcryptjs to avoid native module loading issues in some containers.
      try {
        const bcrypt = await import('bcrypt');
        console.log('login attempt (bcrypt native):', email);
        console.log('user.password (hash):', user.password);
        isValidPassword = await bcrypt.compare(password, user.password || '');
      } catch (err) {
        console.warn('bcrypt native failed to load, falling back to bcryptjs:', err?.message || err);
        const bcryptjs = await import('bcryptjs');
        const bcryptjsModule: any = (bcryptjs as any).default || bcryptjs;
        isValidPassword = bcryptjsModule.compareSync(password, user.password || '');
      }
      console.log('isValidPassword:', isValidPassword);
    }

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    // Remove password from response
    const { password: _, ...safeUser } = user;

    res.json({
      user: safeUser,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
