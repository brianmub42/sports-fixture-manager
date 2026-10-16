import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

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

// POST /api/organizations (Public creation of first or standalone workspace)
router.post('/', async (req, res) => {
  try {
    const { name, event_title, creator_email } = req.body;
    if (!name || !creator_email) {
      return res.status(400).json({ error: 'Organization name and creator email are required' });
    }

    const cleanEmail = creator_email.trim().toLowerCase();

    // Check if creator_email is associated with a suspended workspace
    const checkSuspended = await query(
      "SELECT id, name FROM organizations WHERE LOWER(TRIM(creator_email)) = $1 AND subscription_status = 'suspended'",
      [cleanEmail]
    );
    if (checkSuspended.rows.length > 0) {
      return res.status(402).json({
        error: `You cannot create a new workspace because your existing workspace (${checkSuspended.rows[0].name}) is suspended due to unpaid term fees. Please reactivate your existing workspace first.`,
        code: 'CREATOR_EMAIL_SUSPENDED'
      });
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(name);

    // Create organization
    const orgRes = await query(
      'INSERT INTO organizations (name, slug, event_title, creator_email) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, slug, event_title || 'Championship', cleanEmail]
    );
    const org = orgRes.rows[0];

    // Seed default settings for this organization
    await query(
      "INSERT INTO settings (organization_id, key, value) VALUES ($1, 'org_name', $2), ($1, 'event_title', $3)",
      [org.id, name, event_title || 'Championship']
    );

    // Check if user account already exists with this email
    const existingUserRes = await query('SELECT id, name, role FROM users WHERE LOWER(TRIM(email)) = $1', [cleanEmail]);
    const hasExistingUser = existingUserRes.rows.length > 0;

    if (hasExistingUser) {
      const existingUser = existingUserRes.rows[0];
      // Automatically associate the existing user with the new organization as admin
      await query(
        'INSERT INTO organization_users (organization_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (organization_id, user_id) DO NOTHING',
        [org.id, existingUser.id, 'admin']
      );
    }

    res.status(201).json({
      ...org,
      has_existing_account: hasExistingUser
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
