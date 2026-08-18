import { query } from './db.js';

async function runPatch() {
  console.log('Running database schema patch for billing and POP uploads...');
  try {
    // 1. Add POP file columns
    await query(`
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS pop_file_url VARCHAR(255),
      ADD COLUMN IF NOT EXISTS pop_uploaded_at TIMESTAMP
    `);

    // 2. Add billing info columns
    await query(`
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS billing_school_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS billing_address TEXT
    `);

    // 3. Alter term_expires_at column default value to 14 days
    await query(`
      ALTER TABLE organizations 
      ALTER COLUMN term_expires_at SET DEFAULT NOW() + INTERVAL '14 days'
    `);

    console.log('Database schema patch applied successfully!');
  } catch (err) {
    console.error('Error applying database patch:', err);
  }
}

// Run the patch immediately
runPatch();
