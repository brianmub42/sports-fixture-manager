import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, requireScorekeeperOrAdmin } from '../middleware/auth.js';

const router = Router();
const pendingScores = new Map();

// PATCH /api/scores/:id
router.patch('/:id', authMiddleware, requireScorekeeperOrAdmin, async (req, res) => {
  const { score_a, score_b, playerId, pointsScored } = req.body;
  const requestId = req.body.requestId || req.body.request_id || req.headers['idempotency-key'] || req.headers['x-request-id'];
  const fixtureId = req.params.id;
  const key = `score:${fixtureId}:${score_a}:${score_b}:${playerId || 'none'}:${pointsScored || 0}`;

  if (pendingScores.has(key)) {
    console.log('[Idempotency] Duplicate score request detected, sharing promise for key:', key);
    try {
      const result = await pendingScores.get(key);
      return res.json(result);
    } catch (err) {
      if (err.code === 'RESULT_CONFLICT') {
        return res.status(409).json({
          error: err.message,
          code: err.code,
          existingResult: err.existingResult
        });
      }
      return res.status(err.message === 'Fixture not found' ? 404 : 500).json({ error: err.message });
    }
  }

  const promise = (async () => {
    // Get fixture details
    const fixtureRes = await query('SELECT * FROM fixtures WHERE id = $1 AND organization_id = $2', [fixtureId, req.orgId]);
    const fixture = fixtureRes.rows[0];

    if (!fixture) throw new Error('Fixture not found');

    // Check if result is already recorded
    if (fixture.status === 'completed' || fixture.score_a !== null || fixture.score_b !== null) {
      // Check if it's a retry of the same requestId
      if (requestId && fixture.last_request_id === requestId) {
        console.log('[Idempotency] Request is a retry of a completed submission. Returning recorded result.');
        return { success: true, fixtureId, score_a: fixture.score_a, score_b: fixture.score_b, status: fixture.status };
      }
      // Otherwise, raise conflict
      const err = new Error('Result already recorded for this fixture');
      err.code = 'RESULT_CONFLICT';
      err.existingResult = {
        score_a: fixture.score_a,
        score_b: fixture.score_b,
        submittedBy: fixture.submitted_by,
        submittedAt: fixture.submitted_at
      };
      throw err;
    }

    // Determine winner
    let winnerId = null;
    let status = 'completed';
    if (score_a > score_b) winnerId = fixture.team_a_id;
    else if (score_b > score_a) winnerId = fixture.team_b_id;
    else status = 'draw';

    // Update fixture
    await query(`
      UPDATE fixtures 
      SET score_a = $1, score_b = $2, winner_id = $3, status = $4, submitted_by = $5, submitted_at = NOW(), last_request_id = $6, updated_at = NOW()
      WHERE id = $7
    `, [score_a, score_b, winnerId, status, req.user.name || req.user.email || 'Official', requestId || null, fixtureId]);

    // Log the change
    await query(`
      INSERT INTO score_logs (fixture_id, user_id, old_score_a, old_score_b, new_score_a, new_score_b)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [fixtureId, req.user.id, fixture.score_a, fixture.score_b, score_a, score_b]);

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
    if (err.code === 'RESULT_CONFLICT') {
      res.status(409).json({
        error: err.message,
        code: err.code,
        existingResult: err.existingResult
      });
    } else {
      res.status(err.message === 'Fixture not found' ? 404 : 500).json({ error: err.message });
    }
  } finally {
    // Automatically clean up the map entry after 10 seconds
    setTimeout(() => {
      pendingScores.delete(key);
    }, 10000);
  }
});

// POST /api/scores/:id/correct
// Allows an authorized scorekeeper or admin to overwrite an already-recorded result.
router.post('/:id/correct', authMiddleware, requireScorekeeperOrAdmin, async (req, res) => {
  const { score_a, score_b } = req.body;
  const fixtureId = req.params.id;

  if (score_a === undefined || score_b === undefined) {
    return res.status(400).json({ error: 'Both score_a and score_b are required' });
  }

  try {
    // Get fixture details
    const fixtureRes = await query('SELECT * FROM fixtures WHERE id = $1 AND organization_id = $2', [fixtureId, req.orgId]);
    const fixture = fixtureRes.rows[0];

    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    // Determine winner
    let winnerId = null;
    let status = 'completed';
    if (score_a > score_b) winnerId = fixture.team_a_id;
    else if (score_b > score_a) winnerId = fixture.team_b_id;
    else status = 'draw';

    // Update fixture
    await query(`
      UPDATE fixtures 
      SET score_a = $1, score_b = $2, winner_id = $3, status = $4, submitted_by = $5, submitted_at = NOW(), updated_at = NOW()
      WHERE id = $6
    `, [score_a, score_b, winnerId, status, req.user.name || req.user.email || 'Official', fixtureId]);

    // Log the correction in score_logs
    await query(`
      INSERT INTO score_logs (fixture_id, user_id, old_score_a, old_score_b, new_score_a, new_score_b)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [fixtureId, req.user.id, fixture.score_a, fixture.score_b, score_a, score_b]);

    // Update playoff advancement if applicable (in case winner changed)
    if (fixture.round) {
      const roundName = fixture.round;
      
      const nextMatchRes = await query(`
        SELECT id, notes FROM fixtures
        WHERE sport_id = $1 AND organization_id = $2 AND notes LIKE '%source:%'
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
          // If winnerId changed, update the slot. If winnerId is null (draw), set slot to null
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

    res.json({ success: true, fixtureId, score_a, score_b, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
