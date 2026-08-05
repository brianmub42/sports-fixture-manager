import { query, pool } from './db.js';

async function migrate() {
  try {
    await query('ALTER TABLE districts ADD COLUMN IF NOT EXISTS logo_url VARCHAR(255);');
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}
migrate();
