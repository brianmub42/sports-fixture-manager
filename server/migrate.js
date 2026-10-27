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

      CREATE TABLE IF NOT EXISTS tv_adverts (
          id SERIAL PRIMARY KEY,
          organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
          title VARCHAR(150) NOT NULL,
          tagline VARCHAR(200),
          banner_url TEXT,
          logo_url TEXT,
          website_url TEXT,
          display_duration_seconds INT DEFAULT 10,
          display_type VARCHAR(30) DEFAULT 'both',
          is_active BOOLEAN DEFAULT TRUE,
          sort_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tv_announcements (
          id SERIAL PRIMARY KEY,
          organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
          title VARCHAR(150),
          message TEXT NOT NULL,
          priority VARCHAR(20) DEFAULT 'normal',
          display_duration_seconds INT DEFAULT 15,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW(),
          expires_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tv_adverts_org ON tv_adverts(organization_id);
      CREATE INDEX IF NOT EXISTS idx_tv_announcements_org ON tv_announcements(organization_id);

      CREATE TABLE IF NOT EXISTS push_subscriptions (
          id SERIAL PRIMARY KEY,
          organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
          device_id VARCHAR(100) NOT NULL,
          platform VARCHAR(20) NOT NULL,
          followed_type VARCHAR(20) NOT NULL DEFAULT 'team',
          followed_id INT NOT NULL,
          followed_name VARCHAR(100),
          subscription_json TEXT,
          expo_push_token VARCHAR(200),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(organization_id, device_id, platform)
      );

      CREATE INDEX IF NOT EXISTS idx_push_subs_org_team ON push_subscriptions(organization_id, followed_type, followed_id);
      CREATE INDEX IF NOT EXISTS idx_push_subs_device ON push_subscriptions(organization_id, device_id);

      ALTER TABLE athletics_results ADD COLUMN IF NOT EXISTS tied BOOLEAN DEFAULT FALSE;
      ALTER TABLE athletics_results ADD COLUMN IF NOT EXISTS status VARCHAR(10) DEFAULT 'OK';

      -- Organization columns
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS pop_file_url VARCHAR(255),
      ADD COLUMN IF NOT EXISTS pop_uploaded_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS billing_school_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS billing_address TEXT,
      ADD COLUMN IF NOT EXISTS billing_contact_person VARCHAR(100),
      ADD COLUMN IF NOT EXISTS billing_contact_number VARCHAR(30);

      -- Fixtures columns
      ALTER TABLE fixtures 
      ADD COLUMN IF NOT EXISTS submitted_by VARCHAR(150),
      ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_request_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS score_details JSONB DEFAULT NULL;

      -- Sports columns
      ALTER TABLE sports 
      ADD COLUMN IF NOT EXISTS scoring_system VARCHAR(30) DEFAULT 'standard_points',
      ADD COLUMN IF NOT EXISTS scoring_rules JSONB DEFAULT '{}'::jsonb;

      -- Venues columns
      ALTER TABLE venues 
      ADD COLUMN IF NOT EXISTS supported_disciplines TEXT[] DEFAULT ARRAY[]::TEXT[];

      -- Athletics results columns
      ALTER TABLE athletics_results 
      ADD COLUMN IF NOT EXISTS athlete_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS notes TEXT;

      -- Billing reminders table
      CREATE TABLE IF NOT EXISTS billing_reminders_sent (
          organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
          reminder_type VARCHAR(10) NOT NULL,
          sent_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (organization_id, reminder_type)
      );

      -- Organization users table
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

      -- Spectator FanZone & Media Feed posts
      CREATE TABLE IF NOT EXISTS spectator_feed_posts (
          id SERIAL PRIMARY KEY,
          organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
          fixture_id INT REFERENCES fixtures(id) ON DELETE SET NULL,
          sport_id INT REFERENCES sports(id) ON DELETE SET NULL,
          author_name VARCHAR(100) DEFAULT 'Official Media Desk',
          caption TEXT,
          media_type VARCHAR(20) NOT NULL DEFAULT 'image',
          media_url TEXT NOT NULL,
          thumbnail_url TEXT,
          duration_seconds INT DEFAULT 0,
          is_story_highlight BOOLEAN DEFAULT FALSE,
          story_title VARCHAR(50),
          reactions JSONB DEFAULT '{"fire": 0, "clap": 0, "cheer": 0, "trophy": 0}'::jsonb,
          shares_count INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_feed_org_created ON spectator_feed_posts(organization_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_feed_org_story ON spectator_feed_posts(organization_id, is_story_highlight);

      -- =========================================================================
      -- PHASE 1: SUPERADMIN PLATFORM INFRASTRUCTURE
      -- =========================================================================

      -- 1. Global Platform Configuration Key-Value Store
      CREATE TABLE IF NOT EXISTS platform_settings (
          key VARCHAR(64) PRIMARY KEY,
          value TEXT NOT NULL,
          category VARCHAR(32) DEFAULT 'general',
          description TEXT,
          updated_at TIMESTAMP DEFAULT NOW(),
          updated_by INT REFERENCES users(id) ON DELETE SET NULL
      );

      -- 2. Superadmin Administrative Audit Trail
      CREATE TABLE IF NOT EXISTS superadmin_audit_logs (
          id SERIAL PRIMARY KEY,
          user_id INT REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          target_type VARCHAR(50) NOT NULL,
          target_id VARCHAR(50),
          details JSONB DEFAULT '{}'::jsonb,
          ip_address VARCHAR(45),
          created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON superadmin_audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON superadmin_audit_logs(action);

      -- 3. Enhance Organizations with Quotas and Feature Governance
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS max_teams INT DEFAULT 20,
      ADD COLUMN IF NOT EXISTS max_sports INT DEFAULT 10,
      ADD COLUMN IF NOT EXISTS storage_quota_mb INT DEFAULT 500,
      ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(100),
      ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT FALSE;

      -- 4. Enhance Users with Account Security Controls
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1;

      -- 5. Seed Platform Default Configurations
      INSERT INTO platform_settings (key, value, category, description) VALUES
          ('default_trial_days', '14', 'billing', 'Default trial period duration in days for newly created workspaces'),
          ('default_license_days', '120', 'billing', 'Default duration in days granted upon proof of payment approval'),
          ('grace_period_days', '3', 'billing', 'Number of days a workspace stays in grace period before suspension'),
          ('platform_name', 'FixtureGrid', 'branding', 'Public name of the sports management platform'),
          ('support_email', 'support@fixturegrid.co.zw', 'branding', 'Official superadmin support contact email'),
          ('maintenance_mode', 'false', 'security', 'When true, non-superadmin users see an under-maintenance screen'),
          ('maintenance_message', 'Platform undergoing scheduled maintenance. Please check back shortly.', 'security', 'Notice displayed during maintenance mode'),
          ('allow_public_registration', 'true', 'security', 'Whether new organizers can create workspaces without prior invite')
      ON CONFLICT (key) DO NOTHING;
    `);
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

migrate();
