import { Router } from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import { query } from '../db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// POST /api/upload/fixtures
router.post('/fixtures', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const results = { imported: 0, errors: [], skipped: 0 };

    for (const row of data) {
      try {
        // Map Excel columns to database
        const time = row.time || row.Time || row.TIME;
        const round = row.round || row.Round || row.ROUND || '';
        const venueName = row.venue || row.Venue || row.VENUE;
        const sportName = row.sport || row.Sport || row.SPORT;
        const teamA = row.team_a || row.teamA || row['Team A'];
        const teamB = row.team_b || row.teamB || row['Team B'];
        const scheduledAt = row.scheduled_at || row.scheduledAt || row['Scheduled At'];

        if (!sportName || !teamA || !teamB) {
          results.skipped++;
          continue;
        }

        // Look up IDs
        const sportRes = await query('SELECT id FROM sports WHERE name = $1 AND organization_id = $2', [sportName, req.orgId]);
        if (sportRes.rows.length === 0) {
          results.errors.push(`Sport not found: ${sportName}`);
          continue;
        }
        const sportId = sportRes.rows[0].id;

        const venueRes = await query('SELECT id FROM venues WHERE name = $1 AND organization_id = $2', [venueName, req.orgId]);
        let venueId = venueRes.rows[0]?.id;
        if (!venueId) {
          // Auto-create venue if not exists
          const newVenue = await query('INSERT INTO venues (organization_id, name, type) VALUES ($1, $2, $3) RETURNING id', [req.orgId, venueName, 'court']);
          venueId = newVenue.rows[0].id;
        }

        const teamARes = await query('SELECT id FROM teams WHERE code = $1 AND organization_id = $2', [teamA, req.orgId]);
        if (teamARes.rows.length === 0) {
          results.errors.push(`Team not found: ${teamA}`);
          continue;
        }
        const teamAId = teamARes.rows[0].id;

        let teamBId = null;
        if (teamB !== 'All Teams' && teamB !== 'All Districts') {
          const teamBRes = await query('SELECT id FROM teams WHERE code = $1 AND organization_id = $2', [teamB, req.orgId]);
          if (teamBRes.rows.length === 0) {
            results.errors.push(`Team not found: ${teamB}`);
            continue;
          }
          teamBId = teamBRes.rows[0].id;
        }

        // Insert fixture
        await query(`
          INSERT INTO fixtures (organization_id, sport_id, venue_id, round, team_a_id, team_b_id, scheduled_at, duration_minutes, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'upcoming')
          ON CONFLICT DO NOTHING
        `, [req.orgId, sportId, venueId, round, teamAId, teamBId, scheduledAt || new Date(), 10]);

        results.imported++;
      } catch (err) {
        results.errors.push(`Row error: ${err.message}`);
      }
    }

    res.json({ success: true, ...results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload/logo
router.post('/logo', authMiddleware, requireAdmin, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No logo uploaded' });
    const { teamCode, districtCode } = req.body;
    const targetCode = teamCode || districtCode;
    if (!targetCode) return res.status(400).json({ error: 'Team code required' });

    const logoUrl = `${process.env.API_URL || 'http://localhost:3000'}/uploads/${req.file.filename}`;
    
    const result = await query(
      'UPDATE teams SET logo_url = $1 WHERE code = $2 AND organization_id = $3 RETURNING *',
      [logoUrl, targetCode, req.orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ success: true, team: result.rows[0], district: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/upload/template
router.get('/template', (req, res) => {
  const template = [
    { time: '09:48-09:58', round: 'R1', venue: 'BB Court', sport: 'Basketball', team_a: 'ZAM', team_b: 'TOW', scheduled_at: '2026-08-01T09:48:00' },
    { time: '09:48-09:58', round: 'R1', venue: 'VB Court 1', sport: 'Volleyball', team_a: 'BAR', team_b: 'TEH', scheduled_at: '2026-08-01T09:48:00' },
    { time: '12:18-12:28', round: 'SR1', venue: 'Pitch A', sport: 'Soccer', team_a: 'ZAM', team_b: 'TOW', scheduled_at: '2026-08-01T12:18:00' },
  ];

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(template);
  xlsx.utils.book_append_sheet(wb, ws, 'Fixtures');

  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename=fixtures-template.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

export default router;
