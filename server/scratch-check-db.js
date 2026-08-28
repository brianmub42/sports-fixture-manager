import { pool } from './db.js';

async function main() {
  const res = await pool.query('SELECT * FROM organizations');
  console.log("Organizations in DB:", res.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
