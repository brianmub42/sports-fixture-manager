import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function init() {
  console.log('Reading schema.sql...');
  const sqlPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Executing schema on database...');
  try {
    // Drop old tables first to ensure the new schema is applied cleanly
    console.log('Dropping old tables...');
    await query(`
      DROP TABLE IF EXISTS score_logs, fixture_lineups, athletics_results, fixtures, athletics_events, users, venues, sports, teams, settings, organizations CASCADE;
    `);

    await query(sql);
    console.log('Database schema applied successfully!');
    pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    pool.end();
    process.exit(1);
  }
}

init();
