import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/districts
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM districts WHERE organization_id = $1 ORDER BY name ASC', [req.orgId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/districts
router.post('/', async (req, res) => {
  try {
    const { code, name, color } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'Code and Name are required' });
    }
    const result = await query(
      'INSERT INTO districts (organization_id, code, name, color) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.orgId, code.toUpperCase(), name, color || '#2563eb']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
