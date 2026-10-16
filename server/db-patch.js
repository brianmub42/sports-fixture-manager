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

    // 2.5 Add submitted_by, submitted_at, and last_request_id to fixtures
    await query(`
      ALTER TABLE fixtures 
      ADD COLUMN IF NOT EXISTS submitted_by VARCHAR(150),
      ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_request_id VARCHAR(100)
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

    // 5. Add billing_reminders_sent table
    console.log('Creating billing_reminders_sent table if not exists...');
    await query(`
      CREATE TABLE IF NOT EXISTS billing_reminders_sent (
          organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
          reminder_type VARCHAR(10) NOT NULL,
          sent_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (organization_id, reminder_type)
      )
    `);

    // 6. Add multi-sport & advanced scoring system columns
    console.log('Adding multi-sport scoring columns if not exists...');
    await query(`
      ALTER TABLE sports 
      ADD COLUMN IF NOT EXISTS scoring_system VARCHAR(30) DEFAULT 'standard_points',
      ADD COLUMN IF NOT EXISTS scoring_rules JSONB DEFAULT '{}'::jsonb
    `);

    await query(`
      ALTER TABLE fixtures 
      ADD COLUMN IF NOT EXISTS score_details JSONB DEFAULT NULL
    `);

    await query(`
      ALTER TABLE venues 
      ADD COLUMN IF NOT EXISTS supported_disciplines TEXT[] DEFAULT ARRAY[]::TEXT[]
    `);

    await query(`
      ALTER TABLE athletics_results 
      ADD COLUMN IF NOT EXISTS athlete_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS notes TEXT
    `);

    // 7. Multi-Tournament Account Support: organization_users table
    console.log('Creating organization_users table for multi-tournament account management...');
    await query(`
      CREATE TABLE IF NOT EXISTS organization_users (
          id SERIAL PRIMARY KEY,
          organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(20) DEFAULT 'admin',
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(organization_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_org_users_user ON organization_users(user_id);
      CREATE INDEX IF NOT EXISTS idx_org_users_org ON organization_users(organization_id);

      -- Backfill organization_users from users table
      INSERT INTO organization_users (organization_id, user_id, role)
      SELECT organization_id, id, role 
      FROM users 
      WHERE organization_id IS NOT NULL
      ON CONFLICT (organization_id, user_id) DO NOTHING;

      -- Backfill organization_users from organizations.creator_email
      INSERT INTO organization_users (organization_id, user_id, role)
      SELECT o.id, u.id, 'admin' 
      FROM organizations o
      JOIN users u ON LOWER(TRIM(o.creator_email)) = LOWER(TRIM(u.email))
      ON CONFLICT (organization_id, user_id) DO NOTHING;
    `);

    // Safely update users.organization_id foreign key constraint to ON DELETE SET NULL if not already set
    try {
      await query(`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_organization_id_fkey;
        ALTER TABLE users ADD CONSTRAINT users_organization_id_fkey 
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
      `);
    } catch (fkErr) {
      console.warn('Note: users foreign key update notice:', fkErr.message);
    }

    console.log('Database schema patch applied successfully!');
  } catch (err) {
    console.error('Error applying database patch:', err);
  }
}

// Run the patch immediately
runPatch();
