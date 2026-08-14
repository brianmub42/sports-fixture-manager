import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'kalife-2026-secret-key-change-in-production';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields (email, password, name) are required' });
    }

    // Check if user already exists globally
    const checkUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email is already registered' });
    }

    // Check if any users exist in the organization
    const orgUsersCount = await query('SELECT count(*)::int as count FROM users WHERE organization_id = $1', [req.orgId]);
    const isFirstUser = orgUsersCount.rows[0].count === 0;

    if (!isFirstUser) {
      return res.status(400).json({ error: 'Registration is closed for this workspace. Please contact your administrator to get an account.' });
    }

    const finalRole = 'admin';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      'INSERT INTO users (organization_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role',
      [req.orgId, email, passwordHash, name, finalRole]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, organization_id: req.orgId, organization_slug: req.orgSlug },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Look up user (Must match current organization context to prevent logging into wrong tenant!)
    const userRes = await query('SELECT * FROM users WHERE email = $1 AND organization_id = $2', [email, req.orgId]);
    const user = userRes.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, organization_id: req.orgId, organization_slug: req.orgSlug },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/users (Protected: Admin)
router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, name, role, created_at FROM users WHERE organization_id = $1 ORDER BY created_at DESC',
      [req.orgId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/users (Protected: Admin) - Create new users with specific roles
router.post('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields (email, password, name) are required' });
    }

    const checkUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email is already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const finalRole = role || 'viewer';

    const result = await query(
      'INSERT INTO users (organization_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, created_at',
      [req.orgId, email, passwordHash, name, finalRole]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/users/:id (Protected: Admin) - Update user details
router.put('/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const userId = req.params.id;

    // Check if user exists in the organization
    const userCheck = await query('SELECT id FROM users WHERE id = $1 AND organization_id = $2', [userId, req.orgId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in this organization' });
    }

    // If email changed, check for duplicate email
    if (email) {
      const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id <> $2', [email, userId]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'User with this email is already registered' });
      }
    }

    let updateQuery = 'UPDATE users SET name = $1, email = $2, role = $3';
    let params = [name, email, role, req.orgId, userId];

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      updateQuery += ', password_hash = $6 WHERE id = $5 AND organization_id = $4 RETURNING id, email, name, role, created_at';
      params.push(passwordHash);
    } else {
      updateQuery += ' WHERE id = $5 AND organization_id = $4 RETURNING id, email, name, role, created_at';
    }

    const result = await query(updateQuery, params);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/users/:id (Protected: Admin) - Delete a user
router.delete('/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent self-deletion
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own user account.' });
    }

    const result = await query(
      'DELETE FROM users WHERE id = $1 AND organization_id = $2 RETURNING id',
      [userId, req.orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in this organization' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
