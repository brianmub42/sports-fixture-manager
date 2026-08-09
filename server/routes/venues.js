import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/venues
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, type FROM venues WHERE organization_id = $1 ORDER BY name ASC',
      [req.orgId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/venues (Protected: Admin)
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { name, type = 'court' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Venue name is required' });
    }

    const check = await query(
      'SELECT id FROM venues WHERE name = $1 AND organization_id = $2',
      [name.trim(), req.orgId]
    );
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Venue with this name already exists' });
    }

    const result = await query(
      'INSERT INTO venues (organization_id, name, type) VALUES ($1, $2, $3) RETURNING id, name, type',
      [req.orgId, name.trim(), type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/venues/:id (Protected: Admin)
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM venues WHERE id = $1 AND organization_id = $2 RETURNING id',
      [req.params.id, req.orgId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venue not found or unauthorized' });
    }
    res.json({ success: true, message: 'Venue deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
