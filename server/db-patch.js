import { query } from './db.js';
import bcrypt from 'bcryptjs';

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
      ADD COLUMN IF NOT EXISTS billing_address TEXT,
      ADD COLUMN IF NOT EXISTS billing_contact_person VARCHAR(100),
      ADD COLUMN IF NOT EXISTS billing_contact_number VARCHAR(30)
    `);

    // 3. Alter term_expires_at column default value to 14 days
    await query(`
      ALTER TABLE organizations 
      ALTER COLUMN term_expires_at SET DEFAULT NOW() + INTERVAL '14 days'
    `);

    // 4. Seed Superadmin account
    const adminEmail = 'admin@etechzim.co.zw';
    const checkAdmin = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (checkAdmin.rows.length === 0) {
      console.log('Seeding default super-administrator account...');
      let orgId;
      const orgRes = await query('SELECT id FROM organizations LIMIT 1');
      if (orgRes.rows.length > 0) {
        orgId = orgRes.rows[0].id;
      } else {
        const newOrg = await query(
          "INSERT INTO organizations (name, slug, event_title, creator_email) VALUES ($1, $2, $3, $4) RETURNING id",
          ['eTechZim Admin', 'admin', 'System Dashboard', adminEmail]
        );
        orgId = newOrg.rows[0].id;
        await query(
          "INSERT INTO settings (organization_id, key, value) VALUES ($1, 'org_name', $2), ($1, 'event_title', $3)",
          [orgId, 'eTechZim Admin', 'System Dashboard']
        );
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Etechzim2026!', salt);

      await query(
        'INSERT INTO users (organization_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)',
        [orgId, adminEmail, passwordHash, 'eTechZim Superadmin', 'superadmin']
      );
      console.log('Super-administrator account seeded successfully!');
    }

    console.log('Database schema patch applied successfully!');
  } catch (err) {
    console.error('Error applying database patch:', err);
  }
}

// Run the patch immediately
runPatch();
