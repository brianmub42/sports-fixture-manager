import { Router } from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import { query } from '../db.js';
import { authMiddleware, requireAdmin, requireMediaOrAdmin } from '../middleware/auth.js';
import { sendPopUploadNotification } from '../lib/email.js';
import { classifySport, classifyVenue } from '../lib/sportClassifier.js';
import { parseSafeLocalDate } from '../lib/scheduler.js';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// POST /api/upload/fixtures
router.post('/fixtures', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Parse using header: 1 to get raw rows
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    if (rows.length === 0) return res.status(400).json({ error: 'No data found in sheet' });

    const results = { imported: 0, errors: [], skipped: 0 };

    // Detect if first row is a header
    const firstRow = rows[0];
    const headerKeywords = [
      'sport', 'team_a', 'teama', 'team a', 'team_b', 'teamb', 'team b',
      'venue', 'time', 'round', 'scheduled_at', 'scheduledat', 'scheduled at',
      'event', 'event_name', 'event name', 'category', 'duration', 'duration_minutes'
    ];
    const hasHeader = firstRow.some(cell => 
      cell && headerKeywords.includes(String(cell).trim().toLowerCase())
    );

    let startIdx = 0;
    let colIndices = { time: 0, round: 1, venue: 2, sport: 3, team_a: 4, team_b: 5, scheduled_at: 6 };

    if (hasHeader) {
      startIdx = 1;
      firstRow.forEach((cell, idx) => {
        if (!cell) return;
        const val = String(cell).trim().toLowerCase();
        if (val === 'time') colIndices.time = idx;
        else if (val === 'round') colIndices.round = idx;
        else if (val === 'venue') colIndices.venue = idx;
        else if (val === 'sport') colIndices.sport = idx;
        else if (['team_a', 'teama', 'team a'].includes(val)) colIndices.team_a = idx;
        else if (['team_b', 'teamb', 'team b'].includes(val)) colIndices.team_b = idx;
        else if (['scheduled_at', 'scheduledat', 'scheduled at'].includes(val)) colIndices.scheduled_at = idx;
        else if (['event', 'event_name', 'event name'].includes(val)) colIndices.event = idx;
        else if (['category'].includes(val)) colIndices.category = idx;
        else if (['duration', 'duration_minutes', 'duration (mins)', 'duration (minutes)'].includes(val)) colIndices.duration = idx;
      });
    }

    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      try {
        const time = row[colIndices.time] ? String(row[colIndices.time]).trim() : '';
        const round = row[colIndices.round] ? String(row[colIndices.round]).trim() : '';
        const venueName = row[colIndices.venue] ? String(row[colIndices.venue]).trim() : '';
        const sportName = row[colIndices.sport] ? String(row[colIndices.sport]).trim() : '';
        
        let teamA = row[colIndices.team_a] ? String(row[colIndices.team_a]).trim() : '';
        let teamB = '';
        let notes = '';

        const eventVal = colIndices.event !== undefined && row[colIndices.event] ? String(row[colIndices.event]).trim() : '';
        const categoryVal = colIndices.category !== undefined && row[colIndices.category] ? String(row[colIndices.category]).trim() : '';
        const durationVal = colIndices.duration !== undefined && row[colIndices.duration] ? parseInt(row[colIndices.duration]) : null;

        // If index 5 is exactly "VS", slide teamB to index 6 and pull notes from index 10
        if (row[5] && String(row[5]).trim().toLowerCase() === 'vs') {
          teamB = row[6] ? String(row[6]).trim() : '';
          notes = row[10] ? String(row[10]).trim() : '';
        } else {
          teamB = row[colIndices.team_b] ? String(row[colIndices.team_b]).trim() : '';
          notes = row[colIndices.scheduled_at + 1] ? String(row[colIndices.scheduled_at + 1]).trim() : '';
        }

        const scheduledAt = row[colIndices.scheduled_at] ? String(row[colIndices.scheduled_at]).trim() : '';

        // Look up or auto-create sport
        const sportRes = await query('SELECT id, scoring_type FROM sports WHERE name = $1 AND organization_id = $2', [sportName, req.orgId]);
        let sportId = sportRes.rows[0]?.id;
        let scoringType = sportRes.rows[0]?.scoring_type || 'points';
        if (!sportId) {
          const profile = classifySport(sportName);
          scoringType = profile.scoring_type;
          const newSport = await query(
            'INSERT INTO sports (organization_id, name, scoring_type, win_points, draw_points) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [req.orgId, sportName, scoringType, scoringType === 'points' ? 3 : 0, scoringType === 'points' ? 1 : 0]
          );
          sportId = newSport.rows[0].id;
        }

        const effectiveEventName = eventVal || teamA;

        // Validate required fields based on scoring type
        if (scoringType !== 'placement' && (!teamA || !teamB)) {
          results.skipped++;
          continue;
        }
        if (scoringType === 'placement' && !effectiveEventName) {
          results.skipped++;
          continue;
        }

        // Look up or auto-create venue
        let venueId = null;
        if (venueName) {
          const venueRes = await query('SELECT id FROM venues WHERE name = $1 AND organization_id = $2', [venueName, req.orgId]);
          venueId = venueRes.rows[0]?.id;
          if (!venueId) {
            const detectedDisciplines = classifyVenue(venueName);
            const sportProfile = classifySport(sportName);
            const detectedType = (detectedDisciplines && detectedDisciplines.length > 0 && detectedDisciplines[0] !== 'general')
              ? detectedDisciplines[0]
              : (sportProfile.discipline || 'court');
            const newVenue = await query('INSERT INTO venues (organization_id, name, type) VALUES ($1, $2, $3) RETURNING id', [req.orgId, venueName, detectedType]);
            venueId = newVenue.rows[0].id;
          }
        }

        // Parse scheduledDate
        let scheduledDate = new Date();
        if (scheduledAt) {
          scheduledDate = parseSafeLocalDate(scheduledAt);
        } else if (time) {
          const startTimeStr = time.split('-')[0].trim();
          const [hours, minutes] = startTimeStr.split(':').map(Number);
          if (!isNaN(hours) && !isNaN(minutes)) {
            scheduledDate.setHours(hours, minutes, 0, 0);
          }
        }

        if (scoringType === 'placement') {
          const sportProfile = classifySport(sportName);
          const effectiveCategory = categoryVal || round || (sportProfile.discipline === 'pool' ? 'Heat 1' : 'Heat / Final');
          const effectiveDuration = durationVal || sportProfile.default_duration || 15;
          // Insert into athletics_events
          await query(`
            INSERT INTO athletics_events (organization_id, sport_id, venue_id, name, category, scheduled_at, duration_minutes, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'upcoming')
            ON CONFLICT DO NOTHING
          `, [
            req.orgId,
            sportId,
            venueId,
            effectiveEventName, // Dynamic event name from file
            effectiveCategory, // Dynamic category/round from file or sport defaults
            scheduledDate,
            effectiveDuration // Dynamic duration from file or sport defaults
          ]);
        } else {
          // Look up or auto-create Team A
          const teamARes = await query('SELECT id FROM teams WHERE code = $1 AND organization_id = $2', [teamA, req.orgId]);
          let teamAId = teamARes.rows[0]?.id;
          if (!teamAId) {
            const cleanName = teamA.charAt(0).toUpperCase() + teamA.slice(1).toLowerCase();
            const newTeam = await query('INSERT INTO teams (organization_id, name, code) VALUES ($1, $2, $3) RETURNING id', [req.orgId, cleanName, teamA]);
            teamAId = newTeam.rows[0].id;
          }

          // Look up or auto-create Team B
          let teamBId = null;
          if (teamB && teamB !== 'All Teams' && teamB !== 'All Districts') {
            const teamBRes = await query('SELECT id FROM teams WHERE code = $1 AND organization_id = $2', [teamB, req.orgId]);
            teamBId = teamBRes.rows[0]?.id;
            if (!teamBId) {
              const cleanName = teamB.charAt(0).toUpperCase() + teamB.slice(1).toLowerCase();
              const newTeam = await query('INSERT INTO teams (organization_id, name, code) VALUES ($1, $2, $3) RETURNING id', [req.orgId, cleanName, teamB]);
              teamBId = newTeam.rows[0].id;
            }
          }

          // Insert fixture (with notes)
          await query(`
            INSERT INTO fixtures (organization_id, sport_id, venue_id, round, team_a_id, team_b_id, scheduled_at, duration_minutes, status, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'upcoming', $9)
            ON CONFLICT DO NOTHING
          `, [req.orgId, sportId, venueId, round, teamAId, teamBId, scheduledDate, 10, notes]);
        }

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

    const logoUrl = `/uploads/${req.file.filename}`;
    
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

// POST /api/upload/pop
router.post('/pop', authMiddleware, requireAdmin, upload.single('pop'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No proof of payment file uploaded' });

    const popUrl = `/uploads/${req.file.filename}`;
    
    // Update the organization's POP record
    const result = await query(
      `UPDATE organizations 
       SET pop_file_url = $1, 
           pop_uploaded_at = NOW(), 
           subscription_status = 'pending_verification'
       WHERE id = $2
       RETURNING name, pop_uploaded_at`,
      [popUrl, req.orgId]
    );

    const org = result.rows[0];
    if (org) {
      // Trigger superadmin email notification asynchronously (non-blocking)
      sendPopUploadNotification(org.name, org.pop_uploaded_at).catch(err => {
        console.error('[Email Trigger Error] Error invoking sendPopUploadNotification:', err);
      });
    }

    res.json({ success: true, popFileUrl: popUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload/sponsor-logo (Admin or Media Manager)
router.post('/sponsor-logo', authMiddleware, requireMediaOrAdmin, upload.single('sponsorLogo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No logo file uploaded' });
    const logoUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, logoUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload/advert-banner (Admin or Media Manager)
router.post('/advert-banner', authMiddleware, requireMediaOrAdmin, upload.single('banner'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No banner image uploaded' });
    const bannerUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, bannerUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload/feed-media (Admin or Media Manager)
router.post('/feed-media', authMiddleware, requireMediaOrAdmin, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No media file uploaded' });
    const mediaUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, mediaUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


function sendPlacementTemplate(res) {
  const template = [
    { time: '09:00-09:15', sport: 'Swimming', event: 'Butterfly 25m', category: 'Boys Under 10', venue: 'Swimming Pool', scheduled_at: '2026-10-15T09:00:00', duration_minutes: 15 },
    { time: '09:15-09:30', sport: 'Swimming', event: 'Butterfly 25m', category: 'Girls Under 10', venue: 'Swimming Pool', scheduled_at: '2026-10-15T09:15:00', duration_minutes: 15 },
    { time: '09:30-09:45', sport: 'Swimming', event: 'Freestyle 50m', category: 'Boys Under 12', venue: 'Swimming Pool', scheduled_at: '2026-10-15T09:30:00', duration_minutes: 15 },
    { time: '09:45-10:00', sport: 'Swimming', event: 'Freestyle 50m', category: 'Girls Under 12', venue: 'Swimming Pool', scheduled_at: '2026-10-15T09:45:00', duration_minutes: 15 },
    { time: '10:00-10:15', sport: 'Swimming', event: 'Backstroke 50m', category: 'Boys Under 14', venue: 'Swimming Pool', scheduled_at: '2026-10-15T10:00:00', duration_minutes: 15 },
    { time: '10:15-10:30', sport: 'Swimming', event: 'Breaststroke 50m', category: 'Girls Under 14', venue: 'Swimming Pool', scheduled_at: '2026-10-15T10:15:00', duration_minutes: 15 },
    { time: '10:30-10:45', sport: 'Swimming', event: 'Individual Medley 100m', category: 'Boys Open', venue: 'Swimming Pool', scheduled_at: '2026-10-15T10:30:00', duration_minutes: 15 },
    { time: '10:45-11:05', sport: 'Swimming', event: 'Medley Relay 4x25m', category: 'Mixed Open', venue: 'Swimming Pool', scheduled_at: '2026-10-15T10:45:00', duration_minutes: 20 },
  ];

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(template);
  xlsx.utils.book_append_sheet(wb, ws, 'Placement Events');

  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename=placement-events-template.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return res.send(buffer);
}

// GET /api/upload/template/placement
router.get('/template/placement', (req, res) => {
  return sendPlacementTemplate(res);
});

// GET /api/upload/template
router.get('/template', (req, res) => {
  const type = req.query.type;
  if (type === 'placement' || type === 'swimming' || type === 'athletics') {
    return sendPlacementTemplate(res);
  }

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
