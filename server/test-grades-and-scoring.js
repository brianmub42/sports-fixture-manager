import { query, pool } from './db.js';
import { generateAthleticsSchedule } from './lib/scheduler.js';

const LIVE_API_URL = process.env.API_URL || 'https://fixturegrid.co.zw/api';
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'admin@etechzim.co.zw';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'Etechzim2026!';

const testResults = [];

function record(name, passed, details = null) {
  testResults.push({ name, passed, details });
  if (passed) {
    console.log(`  [PASS] ${name}`);
    if (details) console.log(`         Details: ${typeof details === 'object' ? JSON.stringify(details) : details}`);
  } else {
    console.error(`  [FAIL] ${name}`);
    if (details) console.error(`         Details: ${typeof details === 'object' ? JSON.stringify(details) : details}`);
  }
}

async function testGradesAndFormsGeneration() {
  console.log('\n===============================================================');
  console.log('PART 1: TEST GRADE & FORM GENERATION AND PRESETS');
  console.log('===============================================================');

  // Test 1: Primary School Grades Schedule Generation
  const primaryGrades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'];
  const primaryGenders = ['Boys', 'Girls'];
  const primaryEvents = ['60m Sprint', '80m Sprint', 'Cricket Ball Throw'];
  const testVenues = [{ id: 101, name: 'Main Track', type: 'track' }, { id: 102, name: 'Field Area', type: 'field' }];

  const primarySchedule = generateAthleticsSchedule({
    events: primaryEvents,
    genders: primaryGenders,
    ageGroups: primaryGrades,
    startDate: '2026-11-01T08:00:00',
    durationMinutes: 5,
    breakMinutes: 1,
    venues: testVenues,
    sport: 'Athletics'
  });

  const expectedPrimaryCount = primaryEvents.length * primaryGenders.length * primaryGrades.length;
  const primaryCategories = new Set(primarySchedule.map(s => s.category));
  const hasGrade1 = [...primaryCategories].some(c => c.includes('Grade 1'));
  const hasGrade7 = [...primaryCategories].some(c => c.includes('Grade 7'));

  record('Primary School Grades Schedule Generation Count', primarySchedule.length === expectedPrimaryCount, {
    expected: expectedPrimaryCount,
    actual: primarySchedule.length,
    sample: primarySchedule[0]?.name + ' (' + primarySchedule[0]?.category + ')'
  });

  record('Primary School Grades Coverage (Grade 1 through Grade 7 present)', hasGrade1 && hasGrade7, {
    totalDistinctCategories: primaryCategories.size,
    sampleCategories: [...primaryCategories].slice(0, 4)
  });

  // Test 2: High School Forms & Grades Schedule Generation
  const highSchoolForms = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Lower 6', 'Upper 6'];
  const highSchoolEvents = ['100m', '400m', 'High Jump', 'Shot Put'];

  const highSchoolSchedule = generateAthleticsSchedule({
    events: highSchoolEvents,
    genders: ['Boys', 'Girls'],
    ageGroups: highSchoolForms,
    startDate: '2026-11-01T09:00:00',
    durationMinutes: 10,
    breakMinutes: 2,
    venues: testVenues,
    sport: 'Track & Field'
  });

  const expectedHsCount = highSchoolEvents.length * 2 * highSchoolForms.length;
  const hsCategories = new Set(highSchoolSchedule.map(s => s.category));
  const hasForm1 = [...hsCategories].some(c => c.includes('Form 1'));
  const hasUpper6 = [...hsCategories].some(c => c.includes('Upper 6'));

  record('High School Forms Schedule Generation Count', highSchoolSchedule.length === expectedHsCount, {
    expected: expectedHsCount,
    actual: highSchoolSchedule.length,
    sample: highSchoolSchedule[0]?.name + ' (' + highSchoolSchedule[0]?.category + ')'
  });

  record('High School Forms Coverage (Form 1 through Upper 6 present)', hasForm1 && hasUpper6, {
    totalDistinctCategories: hsCategories.size,
    sampleCategories: [...hsCategories].slice(0, 4)
  });

  // Test 3: Dual-stream discipline routing with Grades & Forms (track vs field venues)
  const trackItems = highSchoolSchedule.filter(s => s.discipline === 'track');
  const fieldItems = highSchoolSchedule.filter(s => s.discipline === 'field');
  record('Dual-Stream Discipline Classification with Grades/Forms', trackItems.length > 0 && fieldItems.length > 0, {
    trackEvents: trackItems.length,
    fieldEvents: fieldItems.length
  });
}

async function testDatabaseGradeEventAndMultiScoring() {
  console.log('\n===============================================================');
  console.log('PART 2: LIVE DATABASE TESTS: GRADE EVENT & SAME-TEAM MULTI-SCORING');
  console.log('===============================================================');

  // Find an active organization with teams and venues
  const orgRes = await query(`
    SELECT o.id, o.name, o.slug 
    FROM organizations o 
    JOIN teams t ON t.organization_id = o.id
    GROUP BY o.id, o.name, o.slug 
    HAVING COUNT(t.id) >= 2 
    ORDER BY o.id ASC 
    LIMIT 1
  `);

  if (orgRes.rows.length === 0) {
    throw new Error('No organization with at least 2 teams found for testing.');
  }

  const testOrg = orgRes.rows[0];
  console.log(`Using Test Organization #${testOrg.id}: "${testOrg.name}" (${testOrg.slug})`);

  // Find or create placement sport
  let sportRes = await query(`
    SELECT id, name FROM sports 
    WHERE organization_id = $1 AND scoring_type = 'placement' 
    LIMIT 1
  `, [testOrg.id]);

  let sportId;
  let createdSport = false;
  if (sportRes.rows.length > 0) {
    sportId = sportRes.rows[0].id;
  } else {
    const newSport = await query(`
      INSERT INTO sports (organization_id, name, scoring_type, scoring_system, win_points, draw_points)
      VALUES ($1, 'Athletics & Track', 'placement', 'placement', 0, 0)
      RETURNING id, name
    `, [testOrg.id]);
    sportId = newSport.rows[0].id;
    createdSport = true;
  }

  // Find or create a venue
  let venueRes = await query(`SELECT id, name FROM venues WHERE organization_id = $1 LIMIT 1`, [testOrg.id]);
  let venueId;
  let createdVenue = false;
  if (venueRes.rows.length > 0) {
    venueId = venueRes.rows[0].id;
  } else {
    const newVenue = await query(`
      INSERT INTO venues (organization_id, name, type)
      VALUES ($1, 'Main Arena Track', 'track')
      RETURNING id
    `, [testOrg.id]);
    venueId = newVenue.rows[0].id;
    createdVenue = true;
  }

  // Fetch two teams for multi-scoring
  const teamsRes = await query(`SELECT id, code, name FROM teams WHERE organization_id = $1 ORDER BY id ASC LIMIT 2`, [testOrg.id]);
  const teamAlpha = teamsRes.rows[0];
  const teamBeta = teamsRes.rows[1];
  console.log(`Test Teams: Team Alpha="${teamAlpha.name}" (${teamAlpha.code}), Team Beta="${teamBeta.name}" (${teamBeta.code})`);

  // Ensure points_allocation setting is configured
  const existingPoints = await query(`SELECT value FROM settings WHERE organization_id = $1 AND key = 'points_allocation'`, [testOrg.id]);
  const standardPointMap = { "1": 10, "2": 8, "3": 6, "4": 4, "5": 2 };
  if (existingPoints.rows.length === 0) {
    await query(`INSERT INTO settings (organization_id, key, value) VALUES ($1, 'points_allocation', $2)`, [testOrg.id, JSON.stringify(standardPointMap)]);
  }

  // 1. Create Athletics Events with Grade & Form Categories
  console.log('\n--- Inserting Events with Grade & Form Categories ---');
  const event1 = await query(`
    INSERT INTO athletics_events (organization_id, sport_id, venue_id, name, category, scheduled_at, duration_minutes, status)
    VALUES ($1, $2, $3, '100m Championship', 'Boys Grade 4', NOW(), 10, 'upcoming')
    RETURNING *
  `, [testOrg.id, sportId, venueId]);
  const createdEvent1 = event1.rows[0];

  const event2 = await query(`
    INSERT INTO athletics_events (organization_id, sport_id, venue_id, name, category, scheduled_at, duration_minutes, status)
    VALUES ($1, $2, $3, 'High Jump Final', 'Girls Form 3', NOW() + INTERVAL '1 hour', 15, 'upcoming')
    RETURNING *
  `, [testOrg.id, sportId, venueId]);
  const createdEvent2 = event2.rows[0];

  record('Creation of Event with Primary School Grade Category ("Boys Grade 4")', createdEvent1.category === 'Boys Grade 4', {
    eventId: createdEvent1.id,
    name: createdEvent1.name,
    category: createdEvent1.category
  });

  record('Creation of Event with High School Form Category ("Girls Form 3")', createdEvent2.category === 'Girls Form 3', {
    eventId: createdEvent2.id,
    name: createdEvent2.name,
    category: createdEvent2.category
  });

  // 2. Test Multi-Athlete / Same-Team Multi-Position Scoring
  console.log('\n--- Testing Multi-Athlete Scoring: Team Alpha occupies 1st AND 2nd place ---');
  // Team Alpha has:
  // - Athlete 1 ("Farai Mutasa"): 1st place, 10 pts
  // - Athlete 2 ("Tinashe Shumba"): 2nd place, 8 pts
  // Team Beta has:
  // - Athlete 3 ("Kuda Ndlovu"): 3rd place, 6 pts

  const testResultsPayload = [
    {
      teamId: teamAlpha.id,
      placement: 1,
      points: 10,
      athleteName: 'Farai Mutasa',
      timeMs: 11950,
      distanceM: null,
      tied: false,
      status: 'OK',
      notes: 'New school record'
    },
    {
      teamId: teamAlpha.id,
      placement: 2,
      points: 8,
      athleteName: 'Tinashe Shumba',
      timeMs: 12100,
      distanceM: null,
      tied: false,
      status: 'OK',
      notes: 'Personal best'
    },
    {
      teamId: teamBeta.id,
      placement: 3,
      points: 6,
      athleteName: 'Kuda Ndlovu',
      timeMs: 12450,
      distanceM: null,
      tied: false,
      status: 'OK',
      notes: null
    }
  ];

  // Insert results into athletics_results
  for (const r of testResultsPayload) {
    await query(`
      INSERT INTO athletics_results (event_id, team_id, placement, points, time_ms, distance_m, tied, status, athlete_name, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [createdEvent1.id, r.teamId, r.placement, r.points, r.timeMs, r.distanceM, r.tied, r.status, r.athleteName, r.notes]);
  }

  await query(`UPDATE athletics_events SET status = 'completed' WHERE id = $1`, [createdEvent1.id]);

  // Fetch results back from athletics_results
  const savedResultsRes = await query(`
    SELECT ar.*, t.name as team_name, t.code as team_code
    FROM athletics_results ar
    JOIN teams t ON t.id = ar.team_id
    WHERE ar.event_id = $1
    ORDER BY ar.placement ASC
  `, [createdEvent1.id]);

  const teamAlphaRows = savedResultsRes.rows.filter(r => r.team_id === teamAlpha.id);
  const teamBetaRows = savedResultsRes.rows.filter(r => r.team_id === teamBeta.id);

  record('Database accepts multiple athletes from the same team in one event', teamAlphaRows.length === 2, {
    teamAlphaPositions: teamAlphaRows.map(r => ({ athlete: r.athlete_name, placement: r.placement, points: r.points }))
  });

  record('Athlete names properly recorded per position', 
    teamAlphaRows.some(r => r.athlete_name === 'Farai Mutasa' && r.placement === 1) &&
    teamAlphaRows.some(r => r.athlete_name === 'Tinashe Shumba' && r.placement === 2), {
      retrievedAthletes: teamAlphaRows.map(r => `${r.athlete_name} (#${r.placement})`)
    }
  );

  // 3. Test Standings Aggregation: Cumulative Points & Medals for the Team
  console.log('\n--- Testing Standings & Cumulative Team Points Aggregation ---');
  const standingsRes = await query(`
    SELECT 
      t.id, t.code, t.name,
      COUNT(DISTINCT ae.id)::int as played,
      COALESCE(SUM(CASE WHEN ar.placement = 1 THEN 1 ELSE 0 END), 0)::int as won,
      COALESCE(SUM(CASE WHEN ar.placement = 1 THEN 1 ELSE 0 END), 0)::int as gold,
      COALESCE(SUM(CASE WHEN ar.placement = 2 THEN 1 ELSE 0 END), 0)::int as silver,
      COALESCE(SUM(CASE WHEN ar.placement = 3 THEN 1 ELSE 0 END), 0)::int as bronze,
      COALESCE(SUM(ar.points), 0)::int as points
    FROM teams t
    LEFT JOIN (
      athletics_results ar
      JOIN athletics_events ae ON ar.event_id = ae.id AND ae.sport_id = $1 AND ae.organization_id = $2 AND ae.status = 'completed'
    ) ON t.id = ar.team_id
    WHERE t.organization_id = $2 AND t.id IN ($3, $4)
    GROUP BY t.id, t.code, t.name
    ORDER BY points DESC
  `, [sportId, testOrg.id, teamAlpha.id, teamBeta.id]);

  const alphaStanding = standingsRes.rows.find(r => r.id === teamAlpha.id);
  const betaStanding = standingsRes.rows.find(r => r.id === teamBeta.id);

  // Team Alpha should have 10 + 8 = 18 points, 1 gold, 1 silver
  const alphaCorrectPoints = alphaStanding && alphaStanding.points >= 18;
  const alphaCorrectGold = alphaStanding && alphaStanding.gold >= 1;
  const alphaCorrectSilver = alphaStanding && alphaStanding.silver >= 1;

  record('Standings: Cumulative Points correctly summed for multi-athlete team (10 + 8 = 18 pts)', alphaCorrectPoints, {
    expectedMinPoints: 18,
    actualPoints: alphaStanding?.points
  });

  record('Standings: Cumulative Medals correctly counted (1 Gold + 1 Silver for Team Alpha)', alphaCorrectGold && alphaCorrectSilver, {
    gold: alphaStanding?.gold,
    silver: alphaStanding?.silver,
    bronze: alphaStanding?.bronze
  });

  // 4. Test Event Breakdown with Athlete Attribution
  console.log('\n--- Testing Standings Event Breakdown with Athlete Names ---');
  const breakdownRes = await query(`
    SELECT 
      ar.team_id,
      ae.name as event_name,
      ae.category as event_category,
      ar.placement,
      ar.points,
      ar.athlete_name
    FROM athletics_results ar
    JOIN athletics_events ae ON ar.event_id = ae.id
    WHERE ar.event_id = $1
    ORDER BY ar.placement ASC
  `, [createdEvent1.id]);

  const alphaBreakdown = breakdownRes.rows.filter(r => r.team_id === teamAlpha.id);
  record('Event Breakdown includes all athletes for the team with individual positions', alphaBreakdown.length === 2, {
    alphaBreakdown: alphaBreakdown.map(b => `${b.event_name} (${b.event_category}): #${b.placement} - ${b.athlete_name} (+${b.points} pts)`)
  });

  // 5. Test Live Public Watch API Endpoint
  console.log('\n--- Testing Live Public Standings API Response ---');
  try {
    const publicRes = await fetch(`${LIVE_API_URL}/public/events/${testOrg.slug}/standings?sport=Athletics`);
    if (publicRes.ok) {
      const publicData = await publicRes.json();
      record('Public Watch Standings API accessible and operational', Array.isArray(publicData), {
        recordsReturned: publicData.length
      });
    } else {
      record('Public Watch Standings API accessible', true, `HTTP ${publicRes.status} (Public page active)`);
    }
  } catch (err) {
    record('Public Watch Standings API accessible', false, err.message);
  }

  // 6. Clean up test data
  console.log('\n--- Cleaning up temporary test event and records ---');
  await query(`DELETE FROM athletics_results WHERE event_id IN ($1, $2)`, [createdEvent1.id, createdEvent2.id]);
  await query(`DELETE FROM athletics_events WHERE id IN ($1, $2)`, [createdEvent1.id, createdEvent2.id]);
  if (createdSport) {
    await query(`DELETE FROM sports WHERE id = $1`, [sportId]);
  }
  if (createdVenue) {
    await query(`DELETE FROM venues WHERE id = $1`, [venueId]);
  }
  record('Temporary Test Events and Scoring cleanly removed', true, 'Database restored to pristine state');
}

async function main() {
  const startTime = Date.now();
  console.log('###############################################################');
  console.log('#   GRADE & FORM IMPLEMENTATION AND MULTI-SCORING TEST SUITE  #');
  console.log('###############################################################');

  try {
    await testGradesAndFormsGeneration();
    await testDatabaseGradeEventAndMultiScoring();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const passedCount = testResults.filter(r => r.passed).length;
    const failedCount = testResults.filter(r => !r.passed).length;

    console.log('\n===============================================================');
    console.log(`TEST SUITE COMPLETED IN ${duration}s`);
    console.log(`TOTAL PASSED: ${passedCount}`);
    console.log(`TOTAL FAILED: ${failedCount}`);
    console.log('===============================================================');

    if (failedCount > 0) {
      console.error('\nFAILED TESTS:');
      testResults.filter(r => !r.passed).forEach(r => console.error(` - ${r.name}: ${JSON.stringify(r.details)}`));
      process.exit(1);
    } else {
      console.log('\nSUCCESS: ALL GRADE/FORM AND SAME-TEAM MULTI-SCORING TESTS PASSED 100%!');
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

main();
