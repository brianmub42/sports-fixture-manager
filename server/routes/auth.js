import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { hashToken, generateOTP, generateToken, sendPasswordResetEmail } from '../utils/email.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'kalife-2026-secret-key-change-in-production';


// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    let { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields (email, password, name) are required' });
    }
    email = email.trim().toLowerCase();

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
    let { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    email = email.trim().toLowerCase();

    // Look up user globally first (Superadmins can log in from any workspace)
    const userRes = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userRes.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // If not superadmin, ensure they belong to the current organization context
    if (user.role !== 'superadmin' && user.organization_id !== req.orgId) {
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
    let { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields (email, password, name) are required' });
    }
    email = email.trim().toLowerCase();

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
    let { email, password, name, role } = req.body;
    const userId = req.params.id;
    if (email) email = email.trim().toLowerCase();

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

// POST /api/auth/forgot-password - Request password reset link and OTP
router.post('/forgot-password', async (req, res) => {
  try {
    let { email, clientUrl } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    email = email.trim().toLowerCase();

    // Look up user by email
    const userRes = await query('SELECT id, email, name FROM users WHERE email = $1', [email]);
    const user = userRes.rows[0];

    if (user) {
      const resetToken = generateToken();
      const otp = generateOTP();
      const tokenHash = hashToken(resetToken);
      const otpHash = hashToken(otp);

      // Clean up previous tokens for this user
      await query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);

      // Insert new token and OTP valid for 15 minutes
      await query(
        "INSERT INTO password_resets (user_id, token_hash, otp_hash, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes')",
        [user.id, tokenHash, otpHash]
      );

      // Send email (async)
      await sendPasswordResetEmail({
        toEmail: user.email,
        name: user.name,
        resetToken,
        otp,
        clientUrl
      });
    }

    // Always respond with success message to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists with this email, password reset instructions have been sent.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-reset-code - Validate OTP or token
router.post('/verify-reset-code', async (req, res) => {
  try {
    let { email, otp, token } = req.body;

    if (token) {
      const tokenHash = hashToken(token);
      const check = await query(
        'SELECT id, user_id FROM password_resets WHERE token_hash = $1 AND expires_at > NOW()',
        [tokenHash]
      );
      if (check.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
      }
      return res.json({ valid: true });
    }

    if (email && otp) {
      email = email.trim().toLowerCase();
      const otpHash = hashToken(otp);
      const check = await query(
        'SELECT pr.id FROM password_resets pr JOIN users u ON pr.user_id = u.id WHERE u.email = $1 AND pr.otp_hash = $2 AND pr.expires_at > NOW()',
        [email, otpHash]
      );
      if (check.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired 6-digit code. Please check and try again.' });
      }
      return res.json({ valid: true });
    }

    return res.status(400).json({ error: 'Either token or email + OTP is required' });
  } catch (err) {
    console.error('Verify reset code error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password - Complete password reset
router.post('/reset-password', async (req, res) => {
  try {
    let { token, email, otp, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    let resetRecord = null;

    if (token) {
      const tokenHash = hashToken(token);
      const resQuery = await query(
        'SELECT pr.*, u.id as user_id, u.email FROM password_resets pr JOIN users u ON pr.user_id = u.id WHERE pr.token_hash = $1 AND pr.expires_at > NOW()',
        [tokenHash]
      );
      resetRecord = resQuery.rows[0];
    } else if (email && otp) {
      email = email.trim().toLowerCase();
      const otpHash = hashToken(otp);
      const resQuery = await query(
        'SELECT pr.*, u.id as user_id, u.email FROM password_resets pr JOIN users u ON pr.user_id = u.id WHERE u.email = $1 AND pr.otp_hash = $2 AND pr.expires_at > NOW()',
        [email, otpHash]
      );
      resetRecord = resQuery.rows[0];
    } else {
      return res.status(400).json({ error: 'A valid reset token or email + OTP is required' });
    }

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset link / verification code. Please request a new one.' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update user's password
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, resetRecord.user_id]);

    // Clean up all reset tokens for this user
    await query('DELETE FROM password_resets WHERE user_id = $1', [resetRecord.user_id]);

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

