import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, requireScorekeeperOrAdmin } from '../middleware/auth.js';

const router = Router();
const pendingScores = new Map();

// PATCH /api/scores/:id
router.patch('/:id', authMiddleware, requireScorekeeperOrAdmin, async (req, res) => {
  const { score_a, score_b, playerId, pointsScored } = req.body;
  const fixtureId = req.params.id;
  const key = `score:${fixtureId}:${score_a}:${score_b}:${playerId || 'none'}:${pointsScored || 0}`;

  if (pendingScores.has(key)) {
    console.log('[Idempotency] Duplicate score request detected, sharing promise for key:', key);
    try {
      const result = await pendingScores.get(key);
      return res.json(result);
    } catch (err) {
      return res.status(err.message === 'Fixture not found' ? 404 : 500).json({ error: err.message });
    }
  }

  const promise = (async () => {
    // Get fixture details
    const fixtureRes = await query('SELECT * FROM fixtures WHERE id = $1 AND organization_id = $2', [fixtureId, req.orgId]);
    const fixture = fixtureRes.rows[0];

    if (!fixture) throw new Error('Fixture not found');

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

    // Invalidate standings cache on write
    try {
      const cacheKeys = await req.redisClient.keys(`leaderboard:${req.orgId}:*`);
      if (cacheKeys.length > 0) {
        await req.redisClient.del(cacheKeys);
        console.log(`[Cache Invalidation] Cleared ${cacheKeys.length} keys for tenant ${req.orgId}`);
      }
    } catch (err) {
      console.error('Redis cache invalidation error:', err);
    }

    return { success: true, fixtureId, score_a, score_b, status };
  })();

  pendingScores.set(key, promise);

  try {
    const result = await promise;
    res.json(result);
  } catch (err) {
    res.status(err.message === 'Fixture not found' ? 404 : 500).json({ error: err.message });
  } finally {
    // Automatically clean up the map entry after 10 seconds
    setTimeout(() => {
      pendingScores.delete(key);
    }, 10000);
  }
});

export default router;
