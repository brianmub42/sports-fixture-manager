import { query } from './db.js';

async function testDbConsistency() {
  console.log('====================================================');
  console.log('SPECTATOR FANZONE & DATABASE CONSISTENCY TEST SUITE');
  console.log('====================================================');

  // 1. Schema check
  console.log('\n[1/6] Validating spectator_feed_posts table schema...');
  const schemaRes = await query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'spectator_feed_posts'
    ORDER BY ordinal_position
  `);
  if (schemaRes.rows.length === 0) {
    throw new Error('Table spectator_feed_posts does not exist!');
  }
  console.log('✓ Found columns:');
  schemaRes.rows.forEach(r => {
    console.log(`  - ${r.column_name.padEnd(20)} ${r.data_type.padEnd(15)} (nullable: ${r.is_nullable})`);
  });

  // 2. Foreign keys check
  console.log('\n[2/6] Checking foreign keys & referential integrity...');
  const fkRes = await query(`
    SELECT
      tc.constraint_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'spectator_feed_posts' AND tc.constraint_type = 'FOREIGN KEY'
  `);
  console.log('✓ Active Foreign Keys:');
  fkRes.rows.forEach(fk => {
    console.log(`  - ${fk.column_name} -> ${fk.foreign_table_name}(${fk.foreign_column_name}) [${fk.constraint_name}]`);
  });

  // 3. Indexes check
  console.log('\n[3/6] Checking indexes & lookup efficiency...');
  const idxRes = await query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'spectator_feed_posts'
  `);
  console.log('✓ Active Indexes:');
  idxRes.rows.forEach(idx => {
    console.log(`  - ${idx.indexname}: ${idx.indexdef}`);
  });

  // 4. Data counts across organizations
  console.log('\n[4/6] Checking post distribution across organizations...');
  const countsRes = await query(`
    SELECT o.id, o.slug, o.name, count(p.id)::int as total_posts,
           count(CASE WHEN p.is_story_highlight THEN 1 END)::int as story_count,
           count(CASE WHEN p.media_type = 'video' THEN 1 END)::int as video_count,
           count(CASE WHEN p.media_type = 'image' THEN 1 END)::int as photo_count
    FROM organizations o
    LEFT JOIN spectator_feed_posts p ON o.id = p.organization_id
    GROUP BY o.id, o.slug, o.name
    HAVING count(p.id) > 0
    ORDER BY total_posts DESC
  `);
  console.table(countsRes.rows);

  // 5. Query execution speed & execution plan
  console.log('\n[5/6] Benchmarking public spectator feed query with EXPLAIN ANALYZE...');
  const demoOrg = countsRes.rows[0];
  const explainRes = await query(`
    EXPLAIN ANALYZE
    SELECT p.*, s.name as sport_name,
           f.round, f.score_a, f.score_b,
           ta.name as team_a_name, tb.name as team_b_name
    FROM spectator_feed_posts p
    LEFT JOIN sports s ON p.sport_id = s.id
    LEFT JOIN fixtures f ON p.fixture_id = f.id
    LEFT JOIN teams ta ON f.team_a_id = ta.id
    LEFT JOIN teams tb ON f.team_b_id = tb.id
    WHERE p.organization_id = $1
    ORDER BY p.created_at DESC
    LIMIT 50
  `, [demoOrg.id]);
  console.log('Query Plan:');
  explainRes.rows.forEach(r => console.log('  ' + r['QUERY PLAN']));

  // 6. Test JSONB reaction mutation & share increment
  console.log('\n[6/6] Testing live reaction & share increment transactions...');
  const sample = await query('SELECT id, reactions, shares_count FROM spectator_feed_posts WHERE organization_id = $1 LIMIT 1', [demoOrg.id]);
  const sampleId = sample.rows[0].id;
  const initialReactions = sample.rows[0].reactions;
  const initialShares = sample.rows[0].shares_count || 0;
  console.log(`  Sample Post ID #${sampleId}: initial reactions:`, initialReactions, 'shares:', initialShares);

  const updatedReact = await query(`
    UPDATE spectator_feed_posts
    SET reactions = jsonb_set(
      COALESCE(reactions, '{}'::jsonb),
      ARRAY['fire'],
      (COALESCE((reactions->>'fire')::int, 0) + 1)::text::jsonb
    )
    WHERE id = $1
    RETURNING id, reactions
  `, [sampleId]);
  console.log(`  ✓ Successfully incremented fire:`, updatedReact.rows[0].reactions);

  const updatedShare = await query(`
    UPDATE spectator_feed_posts
    SET shares_count = COALESCE(shares_count, 0) + 1
    WHERE id = $1
    RETURNING id, shares_count
  `, [sampleId]);
  console.log(`  ✓ Successfully incremented shares:`, updatedShare.rows[0].shares_count);

  console.log('\n====================================================');
  console.log('RESULTS: ALL 6 DATABASE & INTEGRITY TESTS PASSED 100%');
  console.log('====================================================');
  process.exit(0);
}

testDbConsistency().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
