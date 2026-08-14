import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/sports - List all sports in the active organization
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, scoring_type, win_points, draw_points, created_at FROM sports WHERE organization_id = $1 ORDER BY name ASC',
      [req.orgId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sports - Create a new sport (Protected: Admin)
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { name, scoring_type = 'points', win_points = 3, draw_points = 1 } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Sport name is required' });
    }

    const check = await query(
      'SELECT id FROM sports WHERE name = $1 AND organization_id = $2',
      [name.trim(), req.orgId]
    );
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Sport with this name already exists' });
    }

    const result = await query(
      'INSERT INTO sports (organization_id, name, scoring_type, win_points, draw_points) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, scoring_type, win_points, draw_points',
      [req.orgId, name.trim(), scoring_type, win_points, draw_points]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sports/:id - Delete a sport (Protected: Admin)
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM sports WHERE id = $1 AND organization_id = $2 RETURNING id',
      [req.params.id, req.orgId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sport not found or unauthorized' });
    }
    res.json({ success: true, message: 'Sport deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
