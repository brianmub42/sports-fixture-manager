import { query } from './db.js';

async function reset() {
  console.log('Clearing database workspaces...');
  await query('DELETE FROM organizations');
  console.log('Workspaces cleared.');
}

reset().catch(err => {
  console.error('Reset error:', err);
  process.exit(1);
});
