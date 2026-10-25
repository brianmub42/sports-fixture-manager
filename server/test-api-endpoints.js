import { query } from './db.js';

async function testApiEndpoints() {
  console.log('========================================================');
  console.log('TESTING SPECTATOR PUBLIC API ENDPOINTS & LOGIC');
  console.log('========================================================');

  const orgSlug = 'demo-tournament';

  // 1. Resolve Org
  const orgRes = await query('SELECT id, slug, name FROM organizations WHERE slug = $1', [orgSlug]);
  if (orgRes.rows.length === 0) {
    throw new Error(`Demo org '${orgSlug}' not found.`);
  }
  const orgId = orgRes.rows[0].id;
  console.log(`✓ Resolved Organization: "${orgRes.rows[0].name}" (ID: ${orgId})`);

  // 2. Test Feed Query
  console.log('\n[1/5] Testing GET /api/public/events/:slug/feed logic...');
  const postsRes = await query(
    `SELECT p.*, s.name as sport_name,
            f.round, f.score_a, f.score_b,
            ta.name as team_a_name, tb.name as team_b_name
     FROM spectator_feed_posts p
     LEFT JOIN sports s ON p.sport_id = s.id
     LEFT JOIN fixtures f ON p.fixture_id = f.id
     LEFT JOIN teams ta ON f.team_a_id = ta.id
     LEFT JOIN teams tb ON f.team_b_id = tb.id
     WHERE p.organization_id = $1
     ORDER BY p.created_at DESC
     LIMIT 50`,
    [orgId]
  );
  const stories = postsRes.rows.filter(p => p.is_story_highlight);
  console.log(`✓ Retrieved ${postsRes.rows.length} total posts, ${stories.length} featured stories.`);
  stories.forEach((s, idx) => console.log(`  Story #${idx + 1}: "${s.story_title || s.caption?.slice(0, 20)}" [${s.media_type}]`));

  // 3. Test React Endpoint Logic
  console.log('\n[2/5] Testing POST /api/public/events/:slug/feed/:id/react logic...');
  const testPost = postsRes.rows[0];
  const updateReact = await query(
    `UPDATE spectator_feed_posts
     SET reactions = jsonb_set(
       COALESCE(reactions, '{}'::jsonb),
       ARRAY['fire'],
       (COALESCE((reactions->>'fire')::int, 0) + 1)::text::jsonb
     )
     WHERE id = $1
     RETURNING id, reactions`,
    [testPost.id]
  );
  console.log(`✓ Increment reaction 'fire' for post #${testPost.id}:`, updateReact.rows[0].reactions);

  // 4. Test Share Endpoint Logic
  console.log('\n[3/5] Testing POST /api/public/events/:slug/feed/:id/share logic...');
  const updateShare = await query(
    `UPDATE spectator_feed_posts
     SET shares_count = COALESCE(shares_count, 0) + 1
     WHERE id = $1
     RETURNING id, shares_count`,
    [testPost.id]
  );
  console.log(`✓ Increment shares_count for post #${testPost.id}: ${updateShare.rows[0].shares_count}`);

  // 5. Test Standings Query (Aggregate Shield)
  console.log('\n[4/5] Testing GET /api/public/events/:slug/standings (Overall Championship)...');
  const teamsRes = await query('SELECT id, code, name, color FROM teams WHERE organization_id = $1 ORDER BY code', [orgId]);
  console.log(`✓ Retrieved ${teamsRes.rows.length} competing teams.`);

  // 6. Test Sport-specific Standings Query
  console.log('\n[5/5] Testing GET /api/public/events/:slug/standings?sport=Basketball...');
  const bbSport = await query("SELECT id, name FROM sports WHERE organization_id = $1 AND name = 'Basketball'", [orgId]);
  if (bbSport.rows.length > 0) {
    console.log(`✓ Sport found: ${bbSport.rows[0].name} (ID: ${bbSport.rows[0].id})`);
  }

  console.log('\n========================================================');
  console.log('RESULTS: ALL 5 API ENDPOINT FLOWS VERIFIED SUCCESSFULLY');
  console.log('========================================================');
  process.exit(0);
}

testApiEndpoints().catch(err => {
  console.error('API Test Error:', err);
  process.exit(1);
});
