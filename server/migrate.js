import { query, pool } from './db.js';

async function migrate() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS players (
          id SERIAL PRIMARY KEY,
          team_id INT REFERENCES teams(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          jersey_number VARCHAR(10),
          created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS player_stats (
          id SERIAL PRIMARY KEY,
          fixture_id INT REFERENCES fixtures(id) ON DELETE CASCADE,
          player_id INT REFERENCES players(id) ON DELETE CASCADE,
          points_scored INT NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS fixture_lineups (
          id SERIAL PRIMARY KEY,
          fixture_id INT REFERENCES fixtures(id) ON DELETE CASCADE,
          team_id INT REFERENCES teams(id) ON DELETE CASCADE,
          player_id INT REFERENCES players(id) ON DELETE CASCADE,
          role VARCHAR(20) DEFAULT 'starter',
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(fixture_id, player_id)
      );

      CREATE TABLE IF NOT EXISTS password_resets (
          id SERIAL PRIMARY KEY,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(64) NOT NULL,
          otp_hash VARCHAR(64) NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
    `);
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

migrate();
