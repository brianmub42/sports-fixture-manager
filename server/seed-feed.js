import { query } from './db.js';

async function seedFeed() {
  console.log('Seeding spectator feed posts...');

  const orgsRes = await query('SELECT id, slug FROM organizations');
  for (const org of orgsRes.rows) {
    const sportsRes = await query('SELECT id, name FROM sports WHERE organization_id = $1 LIMIT 3', [org.id]);
    const s1 = sportsRes.rows[0]?.id || null;
    const s2 = sportsRes.rows[1]?.id || null;

    const posts = [
      {
        author_name: 'Official Media Desk',
        caption: '🔥 Electric atmosphere! Semi-final clash underway with packed spectator stands and thrilling non-stop action.',
        media_type: 'image',
        media_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1000&q=80',
        sport_id: s1,
        is_story_highlight: true,
        story_title: 'Semi-Final Kickoff',
        reactions: JSON.stringify({ fire: 42, clap: 18, cheer: 29, trophy: 15 }),
      },
      {
        author_name: 'Track & Field Desk',
        caption: '⚡ Unbelievable sprint finish in the 100m heats! Photo finish between lanes 3 and 4.',
        media_type: 'video',
        media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        sport_id: s2,
        is_story_highlight: true,
        story_title: '100m Sprint Heats',
        reactions: JSON.stringify({ fire: 89, clap: 64, cheer: 41, trophy: 32 }),
      },
      {
        author_name: 'Arena Reporter',
        caption: '🏀 Buzzer beater shot from downtown seals a dramatic comeback win in front of the home fans!',
        media_type: 'image',
        media_url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1000&q=80',
        sport_id: s1,
        is_story_highlight: false,
        story_title: '',
        reactions: JSON.stringify({ fire: 56, clap: 33, cheer: 12, trophy: 24 }),
      },
      {
        author_name: 'Tournament Director',
        caption: '🏆 Championship Shield Update: Competition is razor-close with only 3 points separating 1st and 3rd place!',
        media_type: 'image',
        media_url: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?auto=format&fit=crop&w=1000&q=80',
        sport_id: null,
        is_story_highlight: true,
        story_title: 'Shield Leaderboard',
        reactions: JSON.stringify({ fire: 104, clap: 78, cheer: 50, trophy: 88 }),
      }
    ];

    for (const p of posts) {
      await query(
        `INSERT INTO spectator_feed_posts 
          (organization_id, author_name, caption, media_type, media_url, sport_id, is_story_highlight, story_title, reactions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [org.id, p.author_name, p.caption, p.media_type, p.media_url, p.sport_id, p.is_story_highlight, p.story_title, p.reactions]
      );
    }
  }

  console.log('Spectator feed posts seeded successfully for all organizations!');
  process.exit(0);
}

seedFeed().catch(err => {
  console.error('Seed feed error:', err);
  process.exit(1);
});
