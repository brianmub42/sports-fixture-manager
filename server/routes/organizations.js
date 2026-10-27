import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, pool } from '../db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { getWorkspaceQuotaStats } from '../middleware/quota.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'kalife-2026-secret-key-change-in-production';

// Helper to generate a unique organization slug
async function generateUniqueSlug(baseText) {
  let slug = baseText.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  if (!slug) slug = 'tournament';

  let candidateSlug = slug;
  let suffix = 1;
  let isUnique = false;
  while (!isUnique) {
    const checkRes = await query('SELECT id FROM organizations WHERE slug = $1', [candidateSlug]);
    if (checkRes.rows.length === 0) {
      isUnique = true;
    } else {
      candidateSlug = `${slug}-${suffix++}`;
    }
  }
  return candidateSlug;
}

// GET /api/organizations (Public: list all active workspaces)
router.get('/', async (req, res) => {
  try {
    const result = await query(
      "SELECT id, name, slug, event_title, created_at FROM organizations WHERE subscription_status IS NULL OR subscription_status != 'deactivated' ORDER BY name ASC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/organizations/my-tournaments (Protected: list all tournaments belonging to this account)
router.get('/my-tournaments', authMiddleware, async (req, res) => {
  try {
    const userEmail = (req.user?.email || '').trim().toLowerCase();
    const userId = req.user?.id;
    const isSuperadmin = req.user?.role === 'superadmin';

    let result;
    if (isSuperadmin) {
      result = await query(`
        SELECT id, name, slug, event_title, subscription_status, term_expires_at, created_at, 'superadmin' as user_role
        FROM organizations
        WHERE subscription_status IS NULL OR subscription_status != 'deactivated'
        ORDER BY created_at DESC
      `);
    } else {
      result = await query(`
        SELECT DISTINCT o.id, o.name, o.slug, o.event_title, o.subscription_status, o.term_expires_at, o.created_at,
          COALESCE(ou.role, CASE WHEN LOWER(TRIM(o.creator_email)) = $1 THEN 'admin' ELSE 'viewer' END) as user_role
        FROM organizations o
        LEFT JOIN organization_users ou ON ou.organization_id = o.id AND ou.user_id = $2
        WHERE LOWER(TRIM(o.creator_email)) = $1 OR ou.user_id = $2
        ORDER BY o.created_at DESC
      `, [userEmail, userId]);
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user tournaments:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/organizations/create-tournament (Protected: Create next tournament under current account with optional cloning)
router.post('/create-tournament', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { event_title, name, slug: customSlug, copyTeams = true, copySports = true, copyVenues = true, copySponsors = true } = req.body;
    
    if (!event_title || !event_title.trim()) {
      return res.status(400).json({ error: 'Tournament / Event title is required' });
    }

    const creatorEmail = (req.user?.email || '').trim().toLowerCase();
    const orgName = (name || req.orgInfo?.name || 'Tournament Organization').trim();
    const sourceOrgId = req.orgId;

    // Check if creator has a suspended workspace
    const checkSuspended = await query(
      "SELECT id, name FROM organizations WHERE LOWER(TRIM(creator_email)) = $1 AND subscription_status = 'suspended'",
      [creatorEmail]
    );
    if (checkSuspended.rows.length > 0 && req.user.role !== 'superadmin') {
      return res.status(402).json({
        error: `Cannot create a new tournament workspace because existing workspace (${checkSuspended.rows[0].name}) is suspended due to unpaid term fees. Please reactivate first.`,
        code: 'CREATOR_EMAIL_SUSPENDED'
      });
    }

    // Generate unique slug from orgName and event_title
    const baseSlug = customSlug || `${orgName}-${event_title}`;
    const slug = await generateUniqueSlug(baseSlug);

    // Create new organization row
    const newOrgRes = await query(`
      INSERT INTO organizations (
        name, slug, event_title, creator_email, 
        billing_school_name, billing_address, billing_contact_person, billing_contact_number,
        subscription_status, term_expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW() + INTERVAL '14 days')
      RETURNING *
    `, [
      orgName,
      slug,
      event_title.trim(),
      creatorEmail,
      req.orgInfo?.billing_school_name || orgName,
      req.orgInfo?.billing_address || '',
      req.orgInfo?.billing_contact_person || '',
      req.orgInfo?.billing_contact_number || ''
    ]);

    const newOrg = newOrgRes.rows[0];

    // Seed default settings for the new workspace
    await query(
      "INSERT INTO settings (organization_id, key, value) VALUES ($1, 'org_name', $2), ($1, 'event_title', $3)",
      [newOrg.id, orgName, event_title.trim()]
    );

    // Link user to new organization in organization_users
    if (req.user?.id) {
      await query(
        'INSERT INTO organization_users (organization_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (organization_id, user_id) DO NOTHING',
        [newOrg.id, req.user.id, 'admin']
      );
    }

    // CLONING: If source organization exists, copy selected components
    if (sourceOrgId) {
      // 1. Copy Sports
      if (copySports) {
        await query(`
          INSERT INTO sports (organization_id, name, scoring_type, scoring_system, scoring_rules, win_points, draw_points)
          SELECT $1, name, scoring_type, scoring_system, scoring_rules, win_points, draw_points
          FROM sports 
          WHERE organization_id = $2
          ON CONFLICT (organization_id, name) DO NOTHING
        `, [newOrg.id, sourceOrgId]);
      }

      // 2. Copy Venues
      if (copyVenues) {
        await query(`
          INSERT INTO venues (organization_id, name, type, supported_disciplines)
          SELECT $1, name, type, supported_disciplines
          FROM venues 
          WHERE organization_id = $2
          ON CONFLICT (organization_id, name) DO NOTHING
        `, [newOrg.id, sourceOrgId]);
      }

      // 3. Copy Teams
      if (copyTeams) {
        await query(`
          INSERT INTO teams (organization_id, code, name, color, logo_url)
          SELECT $1, code, name, color, logo_url
          FROM teams 
          WHERE organization_id = $2
          ON CONFLICT (organization_id, code) DO NOTHING
        `, [newOrg.id, sourceOrgId]);
      }

      // 4. Copy Sponsors and Scoring Settings
      if (copySponsors) {
        const copySettingsRes = await query(`
          SELECT key, value 
          FROM settings 
          WHERE organization_id = $1 AND key IN ('sponsors', 'points_allocation', 'enable_tv_adverts', 'enable_tv_post_event_beam', 'tv_layout_mode')
        `, [sourceOrgId]);

        for (const row of copySettingsRes.rows) {
          await query(`
            INSERT INTO settings (organization_id, key, value) 
            VALUES ($1, $2, $3)
            ON CONFLICT (organization_id, key) DO UPDATE SET value = EXCLUDED.value
          `, [newOrg.id, row.key, row.value]);
        }
      }
    }

    // Issue newly scoped JWT token so user immediately has admin access to the new workspace
    const token = jwt.sign(
      {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role === 'superadmin' ? 'superadmin' : 'admin',
        organization_id: newOrg.id,
        organization_slug: newOrg.slug
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      organization: newOrg,
      token,
      message: `Tournament workspace "${event_title}" created successfully!`
    });
  } catch (err) {
    console.error('Error creating next tournament:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/organizations/current/quota (Returns workspace resource quotas and usage)
router.get('/current/quota', async (req, res) => {
  try {
    if (!req.orgId) {
      return res.status(400).json({ error: 'No workspace resolved' });
    }
    const stats = await getWorkspaceQuotaStats(req.orgId);
    if (!stats) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/organizations (Atomic Public creation of workspace & administrator account)
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, event_title, creator_email, admin_name, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Organization / Host name is required' });
    }
    if (!creator_email || !creator_email.trim()) {
      return res.status(400).json({ error: 'Administrator email address is required' });
    }
    if (!admin_name || !admin_name.trim()) {
      return res.status(400).json({ error: 'Administrator full name is required' });
    }
    if (!password || password.trim().length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if public registration is enabled in platform settings
    try {
      const regRes = await client.query("SELECT value FROM platform_settings WHERE key = 'allow_public_registration'");
      if (regRes.rows.length > 0 && regRes.rows[0].value === 'false') {
        return res.status(403).json({
          error: 'New workspace registration is currently disabled by platform administrators. Please contact support.',
          code: 'REGISTRATION_DISABLED'
        });
      }
    } catch {}

    const cleanEmail = creator_email.trim().toLowerCase();
    const cleanOrgName = name.trim();
    const cleanEventTitle = (event_title || 'Championship').trim();
    const cleanAdminName = admin_name.trim();

    // Check if creator_email is associated with a suspended workspace
    const checkSuspended = await client.query(
      "SELECT id, name FROM organizations WHERE LOWER(TRIM(creator_email)) = $1 AND subscription_status = 'suspended'",
      [cleanEmail]
    );
    if (checkSuspended.rows.length > 0) {
      return res.status(402).json({
        error: `You cannot create a new workspace because your existing workspace (${checkSuspended.rows[0].name}) is suspended due to unpaid term fees. Please reactivate your existing workspace first.`,
        code: 'CREATOR_EMAIL_SUSPENDED'
      });
    }

    // Determine default trial duration from platform settings
    let trialDays = 14;
    try {
      const trialRes = await client.query("SELECT value FROM platform_settings WHERE key = 'default_trial_days'");
      if (trialRes.rows.length > 0 && trialRes.rows[0].value) {
        trialDays = parseInt(trialRes.rows[0].value, 10) || 14;
      }
    } catch {}

    // Begin atomic database transaction
    await client.query('BEGIN');

    // 1. Resolve or create user account
    const existingUserRes = await client.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = $1', [cleanEmail]);
    let userRecord;

    if (existingUserRes.rows.length > 0) {
      const existingUser = existingUserRes.rows[0];
      // Verify password against existing account
      const isMatch = await bcrypt.compare(password.trim(), existingUser.password_hash);
      if (!isMatch) {
        await client.query('ROLLBACK');
        return res.status(401).json({
          error: 'An account with this email already exists, but the password provided is incorrect. Please enter your existing password to link this new workspace.',
          code: 'INVALID_EXISTING_PASSWORD'
        });
      }
      userRecord = existingUser;
    } else {
      // Hash password and insert new administrator
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password.trim(), salt);
      const newUserRes = await client.query(`
        INSERT INTO users (email, password_hash, name, role, created_at)
        VALUES ($1, $2, $3, 'admin', NOW())
        RETURNING id, email, name, role, organization_id
      `, [cleanEmail, passwordHash, cleanAdminName]);
      userRecord = newUserRes.rows[0];
    }

    // 2. Generate unique slug
    const slug = await generateUniqueSlug(cleanOrgName);

    // 3. Create organization with trial expiration
    const orgRes = await client.query(`
      INSERT INTO organizations (
        name, slug, event_title, creator_email, 
        subscription_status, term_expires_at, 
        max_teams, max_sports, storage_quota_mb
      ) VALUES ($1, $2, $3, $4, 'active', NOW() + ($5 * INTERVAL '1 day'), 20, 10, 500)
      RETURNING *
    `, [cleanOrgName, slug, cleanEventTitle, cleanEmail, trialDays]);
    const org = orgRes.rows[0];

    // 4. Update user's primary organization_id if unset
    if (!userRecord.organization_id) {
      await client.query('UPDATE users SET organization_id = $1 WHERE id = $2', [org.id, userRecord.id]);
      userRecord.organization_id = org.id;
    }

    // 5. Explicitly link administrator in organization_users
    await client.query(`
      INSERT INTO organization_users (organization_id, user_id, role)
      VALUES ($1, $2, 'admin')
      ON CONFLICT (organization_id, user_id) DO NOTHING
    `, [org.id, userRecord.id]);

    // 6. Seed default settings for this organization
    await client.query(
      "INSERT INTO settings (organization_id, key, value) VALUES ($1, 'org_name', $2), ($1, 'event_title', $3)",
      [org.id, cleanOrgName, cleanEventTitle]
    );

    // 7. Commit atomic transaction
    await client.query('COMMIT');

    // 8. Generate JWT token scoped to this new workspace
    const token = jwt.sign(
      {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: userRecord.role === 'superadmin' ? 'superadmin' : 'admin',
        organization_id: org.id,
        organization_slug: org.slug
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      organization: org,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: userRecord.role === 'superadmin' ? 'superadmin' : 'admin',
        organization_id: org.id,
        organization_slug: org.slug
      },
      token,
      message: `Workspace "${org.name}" and administrator account created successfully!`
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error('Error creating workspace and admin account:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
