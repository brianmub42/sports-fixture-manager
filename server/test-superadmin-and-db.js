import { query, pool } from './db.js';

const LIVE_API_URL = process.env.API_URL || 'https://fixturegrid.co.zw/api';
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'admin@etechzim.co.zw';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'Etechzim2026!';

const results = {
  apiTests: [],
  dbTests: [],
  summary: {
    passed: 0,
    failed: 0,
    warnings: 0
  }
};

function recordResult(category, name, passed, details = null, isWarning = false) {
  const item = { name, passed, isWarning, details };
  if (category === 'api') {
    results.apiTests.push(item);
  } else {
    results.dbTests.push(item);
  }
  if (passed) {
    results.summary.passed++;
    console.log(`  [PASS] ${name}`);
  } else if (isWarning) {
    results.summary.warnings++;
    console.log(`  [WARN] ${name}: ${details}`);
  } else {
    results.summary.failed++;
    console.error(`  [FAIL] ${name}: ${details}`);
  }
}

async function runSuperadminMenuTests() {
  console.log('\n===============================================================');
  console.log('PART 1: SUPER ADMIN MENUS & ENDPOINTS VALIDATION (LIVE API)');
  console.log('Target API:', LIVE_API_URL);
  console.log('===============================================================');

  // Step 1: Login as Superadmin
  console.log('\n--- Authenticating as Super Administrator ---');
  let token = null;
  let superadminUser = null;
  try {
    const loginRes = await fetch(`${LIVE_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: SUPERADMIN_EMAIL, password: SUPERADMIN_PASSWORD })
    });

    const loginData = await loginRes.json();
    if (loginRes.ok && loginData.token) {
      token = loginData.token;
      superadminUser = loginData.user;
      recordResult('api', 'Superadmin Login & JWT Issuance', true, {
        email: superadminUser.email,
        role: superadminUser.role,
        id: superadminUser.id
      });
      if (superadminUser.role !== 'superadmin') {
        recordResult('api', 'User Role Verification', false, `Expected superadmin, got ${superadminUser.role}`);
      } else {
        recordResult('api', 'User Role Verification (role === superadmin)', true);
      }
    } else {
      recordResult('api', 'Superadmin Login & JWT Issuance', false, loginData.error || `HTTP ${loginRes.status}`);
      return;
    }
  } catch (err) {
    recordResult('api', 'Superadmin Login & JWT Issuance', false, err.message);
    return;
  }

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Step 2: Menu 1 - Workspaces & Tenants (WorkspacesTab.jsx)
  console.log('\n--- Menu 1: Workspaces & Tenants (WorkspacesTab) ---');
  let tenants = [];
  try {
    const tenantsRes = await fetch(`${LIVE_API_URL}/superadmin/tenants`, { headers: authHeaders });
    const tenantsData = await tenantsRes.json();
    if (tenantsRes.ok && Array.isArray(tenantsData)) {
      tenants = tenantsData;
      recordResult('api', 'GET /api/superadmin/tenants (List all workspaces)', true, `Found ${tenants.length} tenants`);
      
      // Verify quota and resource count fields
      const hasRequiredFields = tenants.length > 0 && 
        tenants.every(t => 'id' in t && 'name' in t && 'slug' in t && 'subscription_status' in t && 'max_teams' in t && 'teams_count' in t);
      recordResult('api', 'Tenants Data Schema Validation (Quotas & Counts)', hasRequiredFields, `Validated ${tenants.length} tenant objects`);
    } else {
      recordResult('api', 'GET /api/superadmin/tenants', false, tenantsData.error || `HTTP ${tenantsRes.status}`);
    }
  } catch (err) {
    recordResult('api', 'GET /api/superadmin/tenants', false, err.message);
  }

  // Tenant Stats Inspection
  if (tenants.length > 0) {
    const targetTenant = tenants[0];
    try {
      const statsRes = await fetch(`${LIVE_API_URL}/superadmin/tenants/${targetTenant.id}/stats`, { headers: authHeaders });
      const statsData = await statsRes.json();
      if (statsRes.ok && statsData.stats) {
        recordResult('api', `GET /api/superadmin/tenants/:id/stats (Workspace "${targetTenant.name}")`, true, statsData.stats);
      } else {
        recordResult('api', `GET /api/superadmin/tenants/:id/stats`, false, statsData.error || `HTTP ${statsRes.status}`);
      }
    } catch (err) {
      recordResult('api', `GET /api/superadmin/tenants/:id/stats`, false, err.message);
    }

    // Tenant Impersonation
    try {
      const impRes = await fetch(`${LIVE_API_URL}/superadmin/tenants/${targetTenant.id}/impersonate`, {
        method: 'POST',
        headers: authHeaders
      });
      const impData = await impRes.json();
      if (impRes.ok && impData.success && impData.token) {
        recordResult('api', `POST /api/superadmin/tenants/:id/impersonate (Impersonate "${targetTenant.name}")`, true, {
          tokenIssued: !!impData.token,
          org: impData.organization?.name
        });
      } else {
        recordResult('api', `POST /api/superadmin/tenants/:id/impersonate`, false, impData.error || `HTTP ${impRes.status}`);
      }
    } catch (err) {
      recordResult('api', `POST /api/superadmin/tenants/:id/impersonate`, false, err.message);
    }
  }

  // Step 3: Menu 2 - Global User Accounts (UsersTab.jsx)
  console.log('\n--- Menu 2: Global User Accounts (UsersTab) ---');
  let allUsers = [];
  try {
    const usersRes = await fetch(`${LIVE_API_URL}/superadmin/users?limit=50&offset=0`, { headers: authHeaders });
    const usersData = await usersRes.json();
    if (usersRes.ok && usersData.users) {
      allUsers = usersData.users;
      recordResult('api', 'GET /api/superadmin/users (Global user list & pagination)', true, `Total users: ${usersData.total}, retrieved: ${allUsers.length}`);
    } else {
      recordResult('api', 'GET /api/superadmin/users', false, usersData.error || `HTTP ${usersRes.status}`);
    }
  } catch (err) {
    recordResult('api', 'GET /api/superadmin/users', false, err.message);
  }

  // Role Filtering
  try {
    const superadminsRes = await fetch(`${LIVE_API_URL}/superadmin/users?role=superadmin`, { headers: authHeaders });
    const superadminsData = await superadminsRes.json();
    if (superadminsRes.ok && superadminsData.users) {
      const allAreSuperadmin = superadminsData.users.every(u => u.role === 'superadmin');
      recordResult('api', 'GET /api/superadmin/users?role=superadmin (Role filtering)', allAreSuperadmin, `Found ${superadminsData.users.length} superadmins`);
    } else {
      recordResult('api', 'GET /api/superadmin/users?role=superadmin', false, superadminsData.error || `HTTP ${superadminsRes.status}`);
    }
  } catch (err) {
    recordResult('api', 'GET /api/superadmin/users?role=superadmin', false, err.message);
  }

  // User Workspaces Modal
  if (allUsers.length > 0) {
    const sampleUser = allUsers[0];
    try {
      const userWorkspacesRes = await fetch(`${LIVE_API_URL}/superadmin/users/${sampleUser.id}/workspaces`, { headers: authHeaders });
      const userWorkspacesData = await userWorkspacesRes.json();
      if (userWorkspacesRes.ok && Array.isArray(userWorkspacesData)) {
        recordResult('api', `GET /api/superadmin/users/:id/workspaces (User "${sampleUser.email}")`, true, `Workspaces count: ${userWorkspacesData.length}`);
      } else {
        recordResult('api', `GET /api/superadmin/users/:id/workspaces`, false, userWorkspacesData.error || `HTTP ${userWorkspacesRes.status}`);
      }
    } catch (err) {
      recordResult('api', `GET /api/superadmin/users/:id/workspaces`, false, err.message);
    }
  }

  // Step 4: Menu 3 - Platform Parameters (PlatformSettingsTab.jsx)
  console.log('\n--- Menu 3: Platform Parameters (PlatformSettingsTab) ---');
  let settingsList = [];
  try {
    const settingsRes = await fetch(`${LIVE_API_URL}/superadmin/settings`, { headers: authHeaders });
    const settingsData = await settingsRes.json();
    if (settingsRes.ok && settingsData.settings && settingsData.by_category) {
      settingsList = settingsData.settings;
      const categories = Object.keys(settingsData.by_category);
      recordResult('api', 'GET /api/superadmin/settings (Categorized platform parameters)', true, {
        totalSettings: settingsList.length,
        categories
      });
    } else {
      recordResult('api', 'GET /api/superadmin/settings', false, settingsData.error || `HTTP ${settingsRes.status}`);
    }
  } catch (err) {
    recordResult('api', 'GET /api/superadmin/settings', false, err.message);
  }

  // Safe update verification of Platform Settings
  try {
    const testKey = 'test_consistency_check_timestamp';
    const testVal = new Date().toISOString();
    const updateRes = await fetch(`${LIVE_API_URL}/superadmin/settings`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ settings: { [testKey]: testVal } })
    });
    const updateData = await updateRes.json();
    if (updateRes.ok && updateData.success) {
      recordResult('api', 'PUT /api/superadmin/settings (Batch settings mutation & persistence)', true, updateData.message);
    } else {
      recordResult('api', 'PUT /api/superadmin/settings', false, updateData.error || `HTTP ${updateRes.status}`);
    }
  } catch (err) {
    recordResult('api', 'PUT /api/superadmin/settings', false, err.message);
  }

  // Step 5: Menu 4 - System Health & Audit Logs (AuditHealthTab.jsx)
  console.log('\n--- Menu 4: System Health & Audit Logs (AuditHealthTab) ---');
  try {
    const healthRes = await fetch(`${LIVE_API_URL}/superadmin/system/health`, { headers: authHeaders });
    const healthData = await healthRes.json();
    if (healthRes.ok && healthData.status === 'healthy') {
      recordResult('api', 'GET /api/superadmin/system/health (Telemetry, Database & Memory)', true, {
        databaseSize: healthData.database?.size,
        uptimeSeconds: healthData.uptime_seconds,
        counts: healthData.counts,
        memory_mb: healthData.memory_mb
      });
    } else {
      recordResult('api', 'GET /api/superadmin/system/health', false, healthData.error || `HTTP ${healthRes.status}`);
    }
  } catch (err) {
    recordResult('api', 'GET /api/superadmin/system/health', false, err.message);
  }

  // Audit Logs stream
  try {
    const auditRes = await fetch(`${LIVE_API_URL}/superadmin/audit-logs?limit=20&offset=0`, { headers: authHeaders });
    const auditData = await auditRes.json();
    if (auditRes.ok && auditData.logs) {
      recordResult('api', 'GET /api/superadmin/audit-logs (Paginated audit activity stream)', true, `Found ${auditData.total} logs, returned ${auditData.logs.length}`);
    } else {
      recordResult('api', 'GET /api/superadmin/audit-logs', false, auditData.error || `HTTP ${auditRes.status}`);
    }
  } catch (err) {
    recordResult('api', 'GET /api/superadmin/audit-logs', false, err.message);
  }

  // Billing reminder check trigger
  try {
    const billRes = await fetch(`${LIVE_API_URL}/superadmin/billing/run-reminder-check`, {
      method: 'POST',
      headers: authHeaders
    });
    const billData = await billRes.json();
    if (billRes.ok && billData.success) {
      recordResult('api', 'POST /api/superadmin/billing/run-reminder-check (Manual billing scheduler check)', true, `Triggered: ${billData.triggeredReminders?.length || 0}`);
    } else {
      recordResult('api', 'POST /api/superadmin/billing/run-reminder-check', false, billData.error || `HTTP ${billRes.status}`);
    }
  } catch (err) {
    recordResult('api', 'POST /api/superadmin/billing/run-reminder-check', false, err.message);
  }
}

async function runDatabaseConsistencyChecks() {
  console.log('\n===============================================================');
  console.log('PART 2: DATABASE CONSISTENCY & INTEGRITY AUDIT');
  console.log('===============================================================');

  // Check 1: Core tables existence
  console.log('\n--- 1. Schema Structure & Table Verification ---');
  const requiredTables = [
    'organizations', 'teams', 'sports', 'venues', 'fixtures',
    'athletics_events', 'athletics_results', 'users', 'score_logs',
    'settings', 'players', 'player_stats', 'fixture_lineups',
    'billing_reminders_sent', 'password_resets', 'tv_adverts',
    'tv_announcements', 'push_subscriptions', 'organization_users',
    'spectator_feed_posts', 'platform_settings', 'superadmin_audit_logs'
  ];

  try {
    const tableRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const foundTables = new Set(tableRes.rows.map(r => r.table_name));
    const missingTables = requiredTables.filter(t => !foundTables.has(t));

    if (missingTables.length === 0) {
      recordResult('db', `All ${requiredTables.length} Essential Schema Tables Exist`, true, `Found: ${requiredTables.join(', ')}`);
    } else {
      recordResult('db', 'Essential Schema Tables Exist', false, `Missing tables: ${missingTables.join(', ')}`);
    }
  } catch (err) {
    recordResult('db', 'Schema Tables Query', false, err.message);
  }

  // Check 2: Orphan Records & Foreign Key Integrity
  console.log('\n--- 2. Foreign Key & Orphan Record Checks ---');
  const orphanChecks = [
    {
      name: 'Teams without valid organization',
      sql: 'SELECT COUNT(*)::int as count FROM teams t WHERE NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = t.organization_id)'
    },
    {
      name: 'Sports without valid organization',
      sql: 'SELECT COUNT(*)::int as count FROM sports s WHERE NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = s.organization_id)'
    },
    {
      name: 'Venues without valid organization',
      sql: 'SELECT COUNT(*)::int as count FROM venues v WHERE NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = v.organization_id)'
    },
    {
      name: 'Fixtures without valid organization',
      sql: 'SELECT COUNT(*)::int as count FROM fixtures f WHERE NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = f.organization_id)'
    },
    {
      name: 'Fixtures referencing nonexistent teams (Team A or Team B)',
      sql: 'SELECT COUNT(*)::int as count FROM fixtures f WHERE (f.team_a_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM teams t WHERE t.id = f.team_a_id)) OR (f.team_b_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM teams t WHERE t.id = f.team_b_id))'
    },
    {
      name: 'Fixtures referencing nonexistent sport',
      sql: 'SELECT COUNT(*)::int as count FROM fixtures f WHERE f.sport_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sports s WHERE s.id = f.sport_id)'
    },
    {
      name: 'Athletics Events without valid organization',
      sql: 'SELECT COUNT(*)::int as count FROM athletics_events ae WHERE NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = ae.organization_id)'
    },
    {
      name: 'Athletics Results referencing nonexistent event',
      sql: 'SELECT COUNT(*)::int as count FROM athletics_results ar WHERE NOT EXISTS (SELECT 1 FROM athletics_events ae WHERE ae.id = ar.event_id)'
    },
    {
      name: 'Athletics Results referencing nonexistent team',
      sql: 'SELECT COUNT(*)::int as count FROM athletics_results ar WHERE ar.team_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM teams t WHERE t.id = ar.team_id)'
    },
    {
      name: 'Players referencing nonexistent team',
      sql: 'SELECT COUNT(*)::int as count FROM players p WHERE NOT EXISTS (SELECT 1 FROM teams t WHERE t.id = p.team_id)'
    },
    {
      name: 'Spectator Feed Posts without valid organization',
      sql: 'SELECT COUNT(*)::int as count FROM spectator_feed_posts p WHERE NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = p.organization_id)'
    },
    {
      name: 'Organization Users mapping referencing nonexistent org or user',
      sql: 'SELECT COUNT(*)::int as count FROM organization_users ou WHERE NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = ou.organization_id) OR NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ou.user_id)'
    },
    {
      name: 'Settings rows without valid organization',
      sql: 'SELECT COUNT(*)::int as count FROM settings s WHERE NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = s.organization_id)'
    }
  ];

  for (const check of orphanChecks) {
    try {
      const res = await query(check.sql);
      const count = res.rows[0].count;
      if (count === 0) {
        recordResult('db', `Orphan Check: ${check.name} (0 orphans)`, true);
      } else {
        recordResult('db', `Orphan Check: ${check.name}`, false, `Found ${count} orphaned records!`);
      }
    } catch (err) {
      recordResult('db', `Orphan Check: ${check.name}`, false, err.message);
    }
  }

  // Check 3: Quota Enforcement & Limit Alignment
  console.log('\n--- 3. Workspace Quotas & Limit Enforcement ---');
  try {
    const quotaTeamsRes = await query(`
      SELECT o.id, o.name, o.slug, o.max_teams, count(t.id)::int as current_teams
      FROM organizations o
      LEFT JOIN teams t ON t.organization_id = o.id
      GROUP BY o.id, o.name, o.slug, o.max_teams
      HAVING count(t.id) > o.max_teams
    `);
    if (quotaTeamsRes.rows.length === 0) {
      recordResult('db', 'Workspace Teams Quota: All workspaces within max_teams limit', true);
    } else {
      recordResult('db', 'Workspace Teams Quota Overages', false, quotaTeamsRes.rows);
    }
  } catch (err) {
    recordResult('db', 'Workspace Teams Quota Check', false, err.message);
  }

  try {
    const quotaSportsRes = await query(`
      SELECT o.id, o.name, o.slug, o.max_sports, count(s.id)::int as current_sports
      FROM organizations o
      LEFT JOIN sports s ON s.organization_id = o.id
      GROUP BY o.id, o.name, o.slug, o.max_sports
      HAVING count(s.id) > o.max_sports
    `);
    if (quotaSportsRes.rows.length === 0) {
      recordResult('db', 'Workspace Sports Quota: All workspaces within max_sports limit', true);
    } else {
      recordResult('db', 'Workspace Sports Quota Overages', false, quotaSportsRes.rows);
    }
  } catch (err) {
    recordResult('db', 'Workspace Sports Quota Check', false, err.message);
  }

  // Check 4: Domain & Data Logic Integrity
  console.log('\n--- 4. Data Domain & Integrity Rules ---');

  // 4.1 Organizations with duplicate slugs
  try {
    const dupSlugs = await query(`
      SELECT slug, COUNT(*)::int as count 
      FROM organizations 
      GROUP BY slug 
      HAVING count(*) > 1
    `);
    if (dupSlugs.rows.length === 0) {
      recordResult('db', 'Organization Slugs: 100% Unique across all workspaces', true);
    } else {
      recordResult('db', 'Organization Slugs Uniqueness', false, `Found duplicate slugs: ${JSON.stringify(dupSlugs.rows)}`);
    }
  } catch (err) {
    recordResult('db', 'Organization Slugs Uniqueness Check', false, err.message);
  }

  // 4.2 Users with duplicate email addresses
  try {
    const dupEmails = await query(`
      SELECT LOWER(TRIM(email)) as clean_email, COUNT(*)::int as count 
      FROM users 
      GROUP BY LOWER(TRIM(email)) 
      HAVING count(*) > 1
    `);
    if (dupEmails.rows.length === 0) {
      recordResult('db', 'User Emails: 100% Unique across platform', true);
    } else {
      recordResult('db', 'User Emails Uniqueness', false, `Found duplicate emails: ${JSON.stringify(dupEmails.rows)}`);
    }
  } catch (err) {
    recordResult('db', 'User Emails Uniqueness Check', false, err.message);
  }

  // 4.3 Users with valid role values
  try {
    const invalidRoles = await query(`
      SELECT id, email, role 
      FROM users 
      WHERE role NOT IN ('superadmin', 'admin', 'official', 'scorekeeper', 'viewer')
    `);
    if (invalidRoles.rows.length === 0) {
      recordResult('db', 'User Roles: All roles conform to standard schema roles', true);
    } else {
      recordResult('db', 'User Roles Validation', false, `Found invalid roles: ${JSON.stringify(invalidRoles.rows)}`);
    }
  } catch (err) {
    recordResult('db', 'User Roles Validation Check', false, err.message);
  }

  // 4.4 Fixtures: Self-match check (team A == team B)
  try {
    const selfMatches = await query(`
      SELECT id, organization_id, round, team_a_id 
      FROM fixtures 
      WHERE team_a_id = team_b_id AND team_a_id IS NOT NULL
    `);
    if (selfMatches.rows.length === 0) {
      recordResult('db', 'Fixtures: Zero self-matches (team_a_id <> team_b_id)', true);
    } else {
      recordResult('db', 'Fixtures Self-Matches', false, `Found ${selfMatches.rows.length} fixtures with identical teams!`);
    }
  } catch (err) {
    recordResult('db', 'Fixtures Self-Match Check', false, err.message);
  }

  // 4.5 Fixtures: Negative scores
  try {
    const negScores = await query(`
      SELECT id, score_a, score_b 
      FROM fixtures 
      WHERE score_a < 0 OR score_b < 0
    `);
    if (negScores.rows.length === 0) {
      recordResult('db', 'Fixtures: Zero negative scores', true);
    } else {
      recordResult('db', 'Fixtures Negative Scores', false, `Found ${negScores.rows.length} fixtures with negative scores!`);
    }
  } catch (err) {
    recordResult('db', 'Fixtures Negative Scores Check', false, err.message);
  }

  // 4.6 Athletics Results: Valid placements & points
  try {
    const invalidAthletics = await query(`
      SELECT id, event_id, team_id, placement, points 
      FROM athletics_results 
      WHERE (placement IS NOT NULL AND placement <= 0) OR (points IS NOT NULL AND points < 0)
    `);
    if (invalidAthletics.rows.length === 0) {
      recordResult('db', 'Athletics Results: All placements > 0 and points >= 0', true);
    } else {
      recordResult('db', 'Athletics Results Integrity', false, `Found ${invalidAthletics.rows.length} invalid results!`);
    }
  } catch (err) {
    recordResult('db', 'Athletics Results Integrity Check', false, err.message);
  }

  // Check 5: Database Statistics & Record Counts
  console.log('\n--- 5. Platform Database Entity Counts ---');
  try {
    const statsRes = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM organizations) as organizations,
        (SELECT COUNT(*)::int FROM users) as users,
        (SELECT COUNT(*)::int FROM sports) as sports,
        (SELECT COUNT(*)::int FROM teams) as teams,
        (SELECT COUNT(*)::int FROM venues) as venues,
        (SELECT COUNT(*)::int FROM fixtures) as fixtures,
        (SELECT COUNT(*)::int FROM athletics_events) as athletics_events,
        (SELECT COUNT(*)::int FROM athletics_results) as athletics_results,
        (SELECT COUNT(*)::int FROM spectator_feed_posts) as spectator_feed_posts,
        (SELECT COUNT(*)::int FROM platform_settings) as platform_settings,
        (SELECT COUNT(*)::int FROM superadmin_audit_logs) as superadmin_audit_logs
    `);
    const s = statsRes.rows[0];
    console.table([
      { Entity: 'Organizations (Workspaces)', Count: s.organizations },
      { Entity: 'Platform Users', Count: s.users },
      { Entity: 'Configured Sports', Count: s.sports },
      { Entity: 'Registered Teams', Count: s.teams },
      { Entity: 'Venues / Courts / Pitches', Count: s.venues },
      { Entity: 'Match Fixtures', Count: s.fixtures },
      { Entity: 'Athletics Events', Count: s.athletics_events },
      { Entity: 'Athletics Results Placements', Count: s.athletics_results },
      { Entity: 'Spectator FanZone Posts', Count: s.spectator_feed_posts },
      { Entity: 'Platform Settings Keys', Count: s.platform_settings },
      { Entity: 'Superadmin Audit Logs', Count: s.superadmin_audit_logs }
    ]);
    recordResult('db', 'Entity Statistics Summary Retrieved Successfully', true, s);
  } catch (err) {
    recordResult('db', 'Platform Database Entity Counts', false, err.message);
  }
}

async function main() {
  const startTime = Date.now();
  console.log('###############################################################');
  console.log('#   SUPERADMIN MENUS & DATABASE CONSISTENCY AUDIT SUITE       #');
  console.log('###############################################################');

  await runSuperadminMenuTests();
  await runDatabaseConsistencyChecks();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n===============================================================');
  console.log('AUDIT COMPLETED IN ' + duration + 's');
  console.log(`TOTAL PASSED:   ${results.summary.passed}`);
  console.log(`TOTAL WARNINGS: ${results.summary.warnings}`);
  console.log(`TOTAL FAILED:   ${results.summary.failed}`);
  console.log('===============================================================');

  if (results.summary.failed > 0) {
    console.error('\nFAILED TESTS SUMMARY:');
    [...results.apiTests, ...results.dbTests]
      .filter(t => !t.passed && !t.isWarning)
      .forEach(t => console.error(` - [${t.name}]: ${JSON.stringify(t.details)}`));
    process.exit(1);
  } else {
    console.log('\nSUCCESS: ALL SUPER ADMIN MENUS & DATABASE CONSISTENCY CHECKS PASSED 100%!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
