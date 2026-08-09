import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, requireScorekeeperOrAdmin } from '../middleware/auth.js';

const router = Router();

// PATCH /api/scores/:id
router.patch('/:id', authMiddleware, requireScorekeeperOrAdmin, async (req, res) => {
  try {
    const { score_a, score_b, playerId, pointsScored } = req.body;
    const fixtureId = req.params.id;

    // Get fixture details
    const fixtureRes = await query('SELECT * FROM fixtures WHERE id = $1 AND organization_id = $2', [fixtureId, req.orgId]);
    const fixture = fixtureRes.rows[0];

    if (!fixture) return res.status(404).json({ error: 'Fixture not found' });

    // Determine winner
    let winnerId = null;
    let status = 'completed';
    if (score_a > score_b) winnerId = fixture.team_a_id;
    else if (score_b > score_a) winnerId = fixture.team_b_id;
    else status = 'draw';

    // Update fixture
    await query(`
      UPDATE fixtures 
      SET score_a = $1, score_b = $2, winner_id = $3, status = $4, updated_at = NOW()
      WHERE id = $5
    `, [score_a, score_b, winnerId, status, fixtureId]);

    // Log the change
    await query(`
      INSERT INTO score_logs (fixture_id, old_score_a, old_score_b, new_score_a, new_score_b)
      VALUES ($1, $2, $3, $4, $5)
    `, [fixtureId, fixture.score_a, fixture.score_b, score_a, score_b]);

    // Record player stat if provided
    if (playerId) {
      await query(`
        INSERT INTO player_stats (fixture_id, player_id, points_scored)
        VALUES ($1, $2, $3)
      `, [fixtureId, playerId, pointsScored || 1]);
    }

    // Auto-advance playoff winner if applicable
    if (winnerId && fixture.round) {
      const roundName = fixture.round; // e.g. "Quarter-final 1"
      
      const nextMatchRes = await query(`
        SELECT id, notes FROM fixtures
        WHERE sport_id = $1 AND organization_id = $2 AND status = 'upcoming' AND notes LIKE '%source:%'
      `, [fixture.sport_id, req.orgId]);
      
      for (const nextMatch of nextMatchRes.rows) {
        const notes = nextMatch.notes || '';
        let updated = false;
        let updateField = '';
        
        if (notes.includes(`team_a=${roundName}`)) {
          updateField = 'team_a_id';
          updated = true;
        } else if (notes.includes(`team_b=${roundName}`)) {
          updateField = 'team_b_id';
          updated = true;
        }
        
        if (updated) {
          await query(`
            UPDATE fixtures
            SET ${updateField} = $1, updated_at = NOW()
            WHERE id = $2
          `, [winnerId, nextMatch.id]);
          
          if (req.io) {
            req.io.to(`tenant-${req.orgId}`).emit('score-updated', { fixtureId: nextMatch.id, score_a: null, score_b: null, winner_id: null });
          }
        }
      }
    }

    // Broadcast update
    if (req.io) {
      req.io.to(`tenant-${req.orgId}`).emit('score-updated', { fixtureId, score_a, score_b, winner_id: winnerId });
    }

    res.json({ success: true, fixtureId, score_a, score_b, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
