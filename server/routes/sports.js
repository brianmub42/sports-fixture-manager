import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { classifySport, SCORING_PARADIGMS } from '../lib/sportClassifier.js';

const router = Router();

// GET /api/sports - List all sports in the active organization
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, scoring_type, scoring_system, scoring_rules, win_points, draw_points, created_at FROM sports WHERE organization_id = $1 ORDER BY name ASC',
      [req.orgId]
    );

    // Auto-fill scoring_system & scoring_type if null/legacy
    const rows = result.rows.map(row => {
      const detected = classifySport(row.name, row);
      if (!row.scoring_system) {
        row.scoring_system = detected.scoring_system;
        row.scoring_rules = row.scoring_rules || detected.scoring_rules;
      }
      if (!row.scoring_type || row.scoring_type === 'points') {
        if (detected.scoring_type === 'placement') {
          row.scoring_type = 'placement';
        }
      }
      return row;
    });

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sports/scoring-paradigms - List available scoring systems
router.get('/scoring-paradigms', async (req, res) => {
  res.json(SCORING_PARADIGMS);
});

// POST /api/sports - Create a new sport (Protected: Admin)
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { name, scoring_type, scoring_system, scoring_rules, win_points, draw_points } = req.body;
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

    // Auto-detect defaults if not explicitly provided
    const profile = classifySport(name.trim());
    const finalSystem = scoring_system || profile.scoring_system;
    const finalType = scoring_type || profile.scoring_type;
    const finalRules = scoring_rules || profile.scoring_rules;
    const finalWin = win_points !== undefined ? win_points : (finalRules.win_points || 3);
    const finalDraw = draw_points !== undefined ? draw_points : (finalRules.draw_points || 1);

    const result = await query(
      'INSERT INTO sports (organization_id, name, scoring_type, scoring_system, scoring_rules, win_points, draw_points) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.orgId, name.trim(), finalType, finalSystem, JSON.stringify(finalRules), finalWin, finalDraw]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sports/:id - Update sport scoring parameters (Protected: Admin)
router.put('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { name, scoring_type, scoring_system, scoring_rules, win_points, draw_points } = req.body;
    const sportId = req.params.id;

    const existing = await query('SELECT * FROM sports WHERE id = $1 AND organization_id = $2', [sportId, req.orgId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Sport not found' });
    }

    const current = existing.rows[0];
    const finalName = name !== undefined ? name.trim() : current.name;
    const finalSystem = scoring_system !== undefined ? scoring_system : current.scoring_system;
    const finalType = scoring_type !== undefined ? scoring_type : current.scoring_type;
    const finalRules = scoring_rules !== undefined ? scoring_rules : current.scoring_rules;
    const finalWin = win_points !== undefined ? win_points : current.win_points;
    const finalDraw = draw_points !== undefined ? draw_points : current.draw_points;

    const result = await query(
      'UPDATE sports SET name = $1, scoring_type = $2, scoring_system = $3, scoring_rules = $4, win_points = $5, draw_points = $6 WHERE id = $7 AND organization_id = $8 RETURNING *',
      [finalName, finalType, finalSystem, JSON.stringify(finalRules), finalWin, finalDraw, sportId, req.orgId]
    );

    res.json(result.rows[0]);
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

