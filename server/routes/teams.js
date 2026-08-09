import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, requireScorekeeperOrAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/teams
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM teams WHERE organization_id = $1 ORDER BY name ASC', [req.orgId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teams (Admin only or Scorekeeper)
router.post('/', authMiddleware, requireScorekeeperOrAdmin, async (req, res) => {
  try {
    const { code, name, color } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'Code and Name are required' });
    }
    const result = await query(
      'INSERT INTO teams (organization_id, code, name, color) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.orgId, code.toUpperCase(), name, color || '#2563eb']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teams/:id/players
router.get('/:id/players', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT p.* FROM players p JOIN teams t ON p.team_id = t.id WHERE p.team_id = $1 AND t.organization_id = $2 ORDER BY p.name ASC',
      [id, req.orgId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teams/:id/players (Scorekeeper/Admin)
router.post('/:id/players', authMiddleware, requireScorekeeperOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, jersey_number } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    // Validate team belongs to org
    const teamRes = await query('SELECT id FROM teams WHERE id = $1 AND organization_id = $2', [id, req.orgId]);
    if (teamRes.rows.length === 0) return res.status(404).json({ error: 'Team not found' });

    const result = await query(
      'INSERT INTO players (team_id, name, jersey_number) VALUES ($1, $2, $3) RETURNING *',
      [id, name, jersey_number]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/teams/:id/players/:playerId (Scorekeeper/Admin)
router.delete('/:id/players/:playerId', authMiddleware, requireScorekeeperOrAdmin, async (req, res) => {
  try {
    const { id, playerId } = req.params;
    
    // Validate team belongs to org
    const teamRes = await query('SELECT id FROM teams WHERE id = $1 AND organization_id = $2', [id, req.orgId]);
    if (teamRes.rows.length === 0) return res.status(404).json({ error: 'Team not found' });

    const result = await query(
      'DELETE FROM players WHERE team_id = $1 AND id = $2 RETURNING *',
      [id, playerId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Player not found' });

    res.json({ success: true, message: 'Player deleted successfully', player: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
