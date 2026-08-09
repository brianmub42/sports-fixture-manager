import { query } from './db.js';

async function seed() {
  console.log('Seeding database...');

  // Create default organization
  const orgRes = await query(
    "INSERT INTO organizations (name, slug, event_title) VALUES ('FixtureGrid Demo Tournament', 'demo-tournament', 'Inter-District Championship') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id"
  );
  const orgId = orgRes.rows[0].id;
  console.log('Organization created/resolved with ID:', orgId);

  // Settings
  await query("INSERT INTO settings (organization_id, key, value) VALUES ($1, 'org_name', 'FixtureGrid Demo Tournament') ON CONFLICT (organization_id, key) DO UPDATE SET value = EXCLUDED.value", [orgId]);
  await query("INSERT INTO settings (organization_id, key, value) VALUES ($1, 'event_title', 'Inter-District Championship') ON CONFLICT (organization_id, key) DO UPDATE SET value = EXCLUDED.value", [orgId]);
  console.log('Branding settings seeded');

  // Teams
  const teams = [
    ['ZAM', 'Zamar', '#2563eb'],
    ['BAR', 'Barak', '#dc2626'],
    ['HAL', 'Halal', '#16a34a'],
    ['SHA', 'Shabach', '#9333ea'],
    ['TEH', 'Tehillah', '#ea580c'],
    ['TOW', 'Towdah', '#0891b2']
  ];

  for (const [code, name, color] of teams) {
    await query('INSERT INTO teams (organization_id, code, name, color) VALUES ($1, $2, $3, $4) ON CONFLICT (organization_id, code) DO NOTHING', [orgId, code, name, color]);
  }
  console.log('Teams seeded');

  // Sports
  const sports = [
    ['Basketball', 'points', 3, 0],
    ['Volleyball', 'points', 3, 1],
    ['Soccer', 'points', 3, 1],
    ['Tug of War', 'points', 3, 0],
    ['Athletics', 'placement', 0, 0],
    ['Novelty', 'placement', 0, 0]
  ];

  for (const [name, type, win, draw] of sports) {
    await query('INSERT INTO sports (organization_id, name, scoring_type, win_points, draw_points) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (organization_id, name) DO NOTHING', [orgId, name, type, win, draw]);
  }
  console.log('Sports seeded');

  // Venues
  const venues = [
    ['BB Court', 'court'],
    ['VB Court 1', 'court'],
    ['VB Court 2', 'court'],
    ['Pitch A', 'pitch'],
    ['Pitch B', 'pitch'],
    ['Tug Area 1', 'area'],
    ['Tug Area 2', 'area'],
    ['Track', 'track'],
    ['Field 1', 'field'],
    ['Field 2', 'field'],
    ['Field 3', 'field']
  ];

  for (const [name, type] of venues) {
    await query('INSERT INTO venues (organization_id, name, type) VALUES ($1, $2, $3) ON CONFLICT (organization_id, name) DO NOTHING', [orgId, name, type]);
  }
  console.log('Venues seeded');

  // Seed fixtures from the KALIFE schedule
  await seedFixtures(orgId);

  console.log('Database seeded successfully!');
  process.exit(0);
}

async function seedFixtures(orgId) {
  const bbPairs = [['ZAM','TOW'],['ZAM','TEH'],['ZAM','SHA'],['ZAM','HAL'],['ZAM','BAR'],['BAR','TEH'],['TOW','SHA'],['TEH','HAL'],['SHA','BAR'],['HAL','TOW'],['HAL','SHA'],['BAR','HAL'],['TOW','BAR'],['TEH','TOW'],['SHA','TEH']];
  const vbPairs = [['BAR','TEH'],['HAL','SHA'],['TOW','SHA'],['BAR','HAL'],['TEH','HAL'],['TOW','BAR'],['SHA','BAR'],['TEH','TOW'],['HAL','TOW'],['SHA','TEH'],['ZAM','TOW'],['ZAM','TEH'],['ZAM','SHA'],['ZAM','HAL'],['ZAM','BAR'],['ZAM','TOW'],['ZAM','TEH'],['ZAM','SHA'],['ZAM','HAL'],['ZAM','BAR'],['ZAM','TOW'],['ZAM','TEH'],['ZAM','SHA'],['ZAM','HAL'],['ZAM','BAR'],['ZAM','TOW'],['ZAM','TEH'],['ZAM','SHA'],['ZAM','HAL'],['ZAM','BAR']];
  const scPairs = [['ZAM','TOW'],['BAR','TEH'],['HAL','SHA'],['ZAM','TEH'],['TOW','BAR'],['HAL','ZAM'],['SHA','TEH'],['BAR','HAL'],['BAR','ZAM'],['TEH','TOW'],['HAL','TEH'],['SHA','ZAM'],['ZAM','SHA'],['TOW','HAL'],['BAR','TEH'],['HAL','ZAM'],['TOW','SHA'],['ZAM','BAR'],['HAL','BAR'],['SHA','TEH'],['TEH','ZAM'],['HAL','TOW'],['SHA','BAR'],['TEH','HAL'],['BAR','ZAM'],['TOW','SHA'],['HAL','SHA'],['ZAM','BAR'],['BAR','HAL'],['SHA','TOW']];

  const sportIds = {};
  const venueIds = {};
  const teamIds = {};

  const [sportsRes, venuesRes, teamsRes] = await Promise.all([
    query('SELECT id, name FROM sports WHERE organization_id = $1', [orgId]),
    query('SELECT id, name FROM venues WHERE organization_id = $1', [orgId]),
    query('SELECT id, code FROM teams WHERE organization_id = $1', [orgId])
  ]);

  sportsRes.rows.forEach(s => sportIds[s.name] = s.id);
  venuesRes.rows.forEach(v => venueIds[v.name] = v.id);
  teamsRes.rows.forEach(t => teamIds[t.code] = t.id);

  // Basketball
  for (let i = 0; i < bbPairs.length; i++) {
    const [a, b] = bbPairs[i];
    const time = new Date('2026-08-01T09:48:00');
    time.setMinutes(time.getMinutes() + i * 10);
    await query(`
      INSERT INTO fixtures (organization_id, sport_id, venue_id, round, team_a_id, team_b_id, scheduled_at, duration_minutes, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 10, 'upcoming')
      ON CONFLICT DO NOTHING
    `, [orgId, sportIds['Basketball'], venueIds['BB Court'], `R${i+1}`, teamIds[a], teamIds[b], time]);
  }

  // Volleyball
  const vbCourts = ['VB Court 1', 'VB Court 2'];
  for (let i = 0; i < vbPairs.length; i++) {
    const [a, b] = vbPairs[i];
    const time = new Date('2026-08-01T09:48:00');
    time.setMinutes(time.getMinutes() + i * 10);
    await query(`
      INSERT INTO fixtures (organization_id, sport_id, venue_id, round, team_a_id, team_b_id, scheduled_at, duration_minutes, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 10, 'upcoming')
      ON CONFLICT DO NOTHING
    `, [orgId, sportIds['Volleyball'], venueIds[vbCourts[i % 2]], `R${i+1}`, teamIds[a], teamIds[b], time]);
  }

  // Soccer
  const scPitches = ['Pitch A', 'Pitch B'];
  for (let i = 0; i < scPairs.length; i++) {
    const [a, b] = scPairs[i];
    const time = new Date('2026-08-01T12:18:00');
    time.setMinutes(time.getMinutes() + i * 10);
    await query(`
      INSERT INTO fixtures (organization_id, sport_id, venue_id, round, team_a_id, team_b_id, scheduled_at, duration_minutes, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 10, 'upcoming')
      ON CONFLICT DO NOTHING
    `, [orgId, sportIds['Soccer'], venueIds[scPitches[i % 2]], `SR${i+1}`, teamIds[a], teamIds[b], time]);
  }

  // Tug of War
  const twFixtures = [
    ['TOW-G1', 'Tug Area 1', 'ZAM', 'BAR', 'Group A'],
    ['TOW-G1', 'Tug Area 2', 'SHA', 'TEH', 'Group B'],
    ['TOW-G2', 'Tug Area 1', 'ZAM', 'HAL', 'Group A'],
    ['TOW-G2', 'Tug Area 2', 'SHA', 'TOW', 'Group B'],
    ['TOW-G3', 'Tug Area 1', 'BAR', 'HAL', 'Group A'],
    ['TOW-G3', 'Tug Area 2', 'TEH', 'TOW', 'Group B']
  ];

  for (let i = 0; i < twFixtures.length; i++) {
    const [round, venue, a, b, note] = twFixtures[i];
    const time = new Date('2026-08-01T15:13:00');
    time.setMinutes(time.getMinutes() + Math.floor(i / 2) * 10);
    await query(`
      INSERT INTO fixtures (organization_id, sport_id, venue_id, round, team_a_id, team_b_id, scheduled_at, duration_minutes, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 10, 'upcoming', $8)
      ON CONFLICT DO NOTHING
    `, [orgId, sportIds['Tug of War'], venueIds[venue], round, teamIds[a], teamIds[b], time, note]);
  }

  console.log('Fixtures seeded');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
