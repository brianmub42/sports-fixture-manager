import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { authMiddleware, requireSuperadmin } from '../middleware/auth.js';
import { checkBillingReminders } from '../lib/billing-scheduler.js';
import { logSuperadminAction } from '../lib/audit-logger.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'kalife-2026-secret-key-change-in-production';

// Apply auth middleware and requireSuperadmin check globally to all superadmin routes
router.use(authMiddleware);
router.use(requireSuperadmin);

// Helper to get client IP
const getClientIp = (req) => {
  return req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
};

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

// =========================================================================
// 1. WORKSPACE / TENANT MANAGEMENT
// =========================================================================

// GET /api/superadmin/tenants
// Fetch list of all workspaces with quotas, resource counts, billing status and metadata
router.get('/tenants', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        o.id, 
        o.name, 
        o.slug, 
        o.event_title, 
        o.creator_email, 
        o.subscription_status, 
        o.term_expires_at, 
        o.credit_balance,
        o.pop_file_url, 
        o.pop_uploaded_at, 
        o.billing_school_name, 
        o.billing_address, 
        o.billing_contact_person, 
        o.billing_contact_number, 
        o.max_teams,
        o.max_sports,
        o.storage_quota_mb,
        o.custom_domain,
        o.is_featured,
        o.maintenance_mode,
        o.created_at,
        (SELECT COUNT(*)::int FROM teams t WHERE t.organization_id = o.id) AS teams_count,
        (SELECT COUNT(*)::int FROM sports s WHERE s.organization_id = o.id) AS sports_count,
        (SELECT COUNT(*)::int FROM fixtures f WHERE f.organization_id = o.id) AS fixtures_count
      FROM organizations o 
      ORDER BY o.created_at DESC
    `);
    
    // Process minutes remaining for each organization
    const tenants = result.rows.map(org => {
      const expiresAt = org.term_expires_at ? new Date(org.term_expires_at) : null;
      const minutesRemaining = expiresAt ? Math.round((expiresAt - new Date()) / 60000) : 0;
      return {
        ...org,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        minutes_remaining: minutesRemaining
      };
    });

    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/tenants
// Create a new tournament workspace directly from the superadmin console
router.post('/tenants', async (req, res) => {
  try {
    const { 
      name, 
      event_title, 
      creator_email, 
      custom_slug, 
      days = 120,
      max_teams = 20,
      max_sports = 10,
      storage_quota_mb = 500
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Workspace / School name is required' });
    }

    const orgName = name.trim();
    const eventTitle = (event_title || 'Annual Championship').trim();
    const creator = (creator_email || req.user.email || '').trim().toLowerCase();
    
    const baseSlug = custom_slug ? custom_slug.trim() : `${orgName}-${eventTitle}`;
    const slug = await generateUniqueSlug(baseSlug);

    const result = await query(`
      INSERT INTO organizations (
        name, slug, event_title, creator_email, 
        subscription_status, term_expires_at, 
        max_teams, max_sports, storage_quota_mb
      ) VALUES ($1, $2, $3, $4, 'active', NOW() + ($5 * INTERVAL '1 day'), $6, $7, $8)
      RETURNING *
    `, [
      orgName, 
      slug, 
      eventTitle, 
      creator, 
      parseInt(days, 10), 
      parseInt(max_teams, 10), 
      parseInt(max_sports, 10), 
      parseInt(storage_quota_mb, 10)
    ]);

    const newOrg = result.rows[0];

    // Seed default settings row
    await query(
      "INSERT INTO settings (organization_id, key, value) VALUES ($1, 'org_name', $2), ($1, 'event_title', $3)",
      [newOrg.id, orgName, eventTitle]
    );

    // Audit log
    await logSuperadminAction({
      userId: req.user.id,
      action: 'WORKSPACE_CREATE',
      targetType: 'organization',
      targetId: newOrg.id,
      details: { name: orgName, slug, event_title: eventTitle, creator_email: creator, days },
      ipAddress: getClientIp(req)
    });

    res.status(201).json({ success: true, organization: newOrg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/superadmin/tenants/:id
// Update workspace metadata, quotas, or ownership
router.put('/tenants/:id', async (req, res) => {
  try {
    const orgId = req.params.id;
    const {
      name,
      event_title,
      slug: newSlug,
      creator_email,
      max_teams,
      max_sports,
      storage_quota_mb,
      custom_domain,
      is_featured,
      maintenance_mode,
      billing_school_name,
      billing_address,
      billing_contact_person,
      billing_contact_number
    } = req.body;

    const existingRes = await query('SELECT * FROM organizations WHERE id = $1', [orgId]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    const current = existingRes.rows[0];

    // If slug is changing, verify uniqueness
    let finalSlug = current.slug;
    if (newSlug && newSlug.trim() !== current.slug) {
      finalSlug = await generateUniqueSlug(newSlug);
    }

    const updatedRes = await query(`
      UPDATE organizations SET
        name = COALESCE($1, name),
        event_title = COALESCE($2, event_title),
        slug = $3,
        creator_email = COALESCE($4, creator_email),
        max_teams = COALESCE($5, max_teams),
        max_sports = COALESCE($6, max_sports),
        storage_quota_mb = COALESCE($7, storage_quota_mb),
        custom_domain = $8,
        is_featured = COALESCE($9, is_featured),
        maintenance_mode = COALESCE($10, maintenance_mode),
        billing_school_name = COALESCE($11, billing_school_name),
        billing_address = COALESCE($12, billing_address),
        billing_contact_person = COALESCE($13, billing_contact_person),
        billing_contact_number = COALESCE($14, billing_contact_number)
      WHERE id = $15
      RETURNING *
    `, [
      name ? name.trim() : null,
      event_title ? event_title.trim() : null,
      finalSlug,
      creator_email ? creator_email.trim().toLowerCase() : null,
      max_teams !== undefined ? parseInt(max_teams, 10) : null,
      max_sports !== undefined ? parseInt(max_sports, 10) : null,
      storage_quota_mb !== undefined ? parseInt(storage_quota_mb, 10) : null,
      custom_domain !== undefined ? custom_domain : current.custom_domain,
      is_featured !== undefined ? Boolean(is_featured) : null,
      maintenance_mode !== undefined ? Boolean(maintenance_mode) : null,
      billing_school_name,
      billing_address,
      billing_contact_person,
      billing_contact_number,
      orgId
    ]);

    const updated = updatedRes.rows[0];

    // Also update settings table to match
    if (name) {
      await query("INSERT INTO settings (organization_id, key, value) VALUES ($1, 'org_name', $2) ON CONFLICT (organization_id, key) DO UPDATE SET value = $2", [orgId, name.trim()]);
    }
    if (event_title) {
      await query("INSERT INTO settings (organization_id, key, value) VALUES ($1, 'event_title', $2) ON CONFLICT (organization_id, key) DO UPDATE SET value = $2", [orgId, event_title.trim()]);
    }

    await logSuperadminAction({
      userId: req.user.id,
      action: 'WORKSPACE_UPDATE',
      targetType: 'organization',
      targetId: orgId,
      details: { previous: { name: current.name, slug: current.slug }, updated: { name: updated.name, slug: updated.slug } },
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, organization: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/superadmin/tenants/:id/stats
// Deep inspection of resource counts inside a workspace
router.get('/tenants/:id/stats', async (req, res) => {
  try {
    const orgId = req.params.id;

    const orgRes = await query('SELECT id, name, slug, event_title, created_at, storage_quota_mb FROM organizations WHERE id = $1', [orgId]);
    if (orgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const [
      teamsRes,
      sportsRes,
      venuesRes,
      fixturesRes,
      playersRes,
      usersRes,
      feedRes,
      advertsRes
    ] = await Promise.all([
      query('SELECT COUNT(*)::int as count FROM teams WHERE organization_id = $1', [orgId]),
      query('SELECT COUNT(*)::int as count FROM sports WHERE organization_id = $1', [orgId]),
      query('SELECT COUNT(*)::int as count FROM venues WHERE organization_id = $1', [orgId]),
      query('SELECT COUNT(*)::int as count, count(*) FILTER (WHERE status = \'completed\')::int as completed, count(*) FILTER (WHERE status = \'live\')::int as live FROM fixtures WHERE organization_id = $1', [orgId]),
      query('SELECT COUNT(*)::int as count FROM players p JOIN teams t ON t.id = p.team_id WHERE t.organization_id = $1', [orgId]),
      query('SELECT COUNT(*)::int as count FROM organization_users WHERE organization_id = $1', [orgId]),
      query('SELECT COUNT(*)::int as count FROM spectator_feed_posts WHERE organization_id = $1', [orgId]),
      query('SELECT COUNT(*)::int as count FROM tv_adverts WHERE organization_id = $1', [orgId])
    ]);

    res.json({
      organization: orgRes.rows[0],
      stats: {
        teams: teamsRes.rows[0].count,
        sports: sportsRes.rows[0].count,
        venues: venuesRes.rows[0].count,
        fixtures_total: fixturesRes.rows[0].count,
        fixtures_completed: fixturesRes.rows[0].completed,
        fixtures_live: fixturesRes.rows[0].live,
        players: playersRes.rows[0].count,
        assigned_officials: usersRes.rows[0].count,
        feed_posts: feedRes.rows[0].count,
        tv_adverts: advertsRes.rows[0].count
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/tenants/:id/impersonate
// Issues a temporary JWT scoped to this tournament workspace with full admin privileges
router.post('/tenants/:id/impersonate', async (req, res) => {
  try {
    const orgId = req.params.id;
    const orgRes = await query('SELECT id, name, slug, event_title FROM organizations WHERE id = $1', [orgId]);
    if (orgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    const org = orgRes.rows[0];

    // Issue a 1-day scoped token retaining superadmin root status with target org scope
    const impersonationToken = jwt.sign(
      {
        id: req.user.id,
        email: req.user.email,
        name: `${req.user.name || 'Superadmin'} (Impersonating)`,
        role: 'superadmin',
        impersonated: true,
        organization_id: org.id,
        organization_slug: org.slug
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    await logSuperadminAction({
      userId: req.user.id,
      action: 'WORKSPACE_IMPERSONATE',
      targetType: 'organization',
      targetId: org.id,
      details: { orgName: org.name, slug: org.slug },
      ipAddress: getClientIp(req)
    });

    res.json({
      success: true,
      token: impersonationToken,
      organization: org,
      message: `Impersonation session created for "${org.name}"`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/tenants/:id/approve
router.post('/tenants/:id/approve', async (req, res) => {
  try {
    const orgId = req.params.id;
    const { days } = req.body;
    const extensionDays = days ? parseInt(days, 10) : 120;

    await query(
      `UPDATE organizations 
       SET subscription_status = 'active', 
           term_expires_at = NOW() + ($1 * INTERVAL '1 day') 
       WHERE id = $2`,
      [extensionDays, orgId]
    );

    await logSuperadminAction({
      userId: req.user.id,
      action: 'LICENSE_APPROVE',
      targetType: 'organization',
      targetId: orgId,
      details: { extensionDays },
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, message: `Workspace license approved for ${extensionDays} days` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/tenants/:id/suspend
router.post('/tenants/:id/suspend', async (req, res) => {
  try {
    const orgId = req.params.id;

    await query(
      `UPDATE organizations 
       SET subscription_status = 'suspended' 
       WHERE id = $1`,
      [orgId]
    );

    await logSuperadminAction({
      userId: req.user.id,
      action: 'LICENSE_SUSPEND',
      targetType: 'organization',
      targetId: orgId,
      details: {},
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, message: 'Workspace license suspended' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/tenants/:id/extend
router.post('/tenants/:id/extend', async (req, res) => {
  try {
    const orgId = req.params.id;
    const { expiresAt } = req.body;
    if (!expiresAt) {
      return res.status(400).json({ error: 'Expiration date is required' });
    }

    await query(
      `UPDATE organizations 
       SET subscription_status = 'active', 
           term_expires_at = $1 
       WHERE id = $2`,
      [expiresAt, orgId]
    );

    await logSuperadminAction({
      userId: req.user.id,
      action: 'LICENSE_EXTEND',
      targetType: 'organization',
      targetId: orgId,
      details: { expiresAt },
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, message: 'Workspace expiration updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/tenants/:id/deactivate
router.post('/tenants/:id/deactivate', async (req, res) => {
  try {
    const orgId = req.params.id;
    if (parseInt(orgId, 10) === 1) {
      return res.status(400).json({ error: 'Cannot deactivate the primary system organization' });
    }

    await query("UPDATE organizations SET subscription_status = 'deactivated' WHERE id = $1", [orgId]);

    await logSuperadminAction({
      userId: req.user.id,
      action: 'WORKSPACE_DEACTIVATE',
      targetType: 'organization',
      targetId: orgId,
      details: {},
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, message: 'Workspace deactivated and hidden from list' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/tenants/:id/activate
router.post('/tenants/:id/activate', async (req, res) => {
  try {
    const orgId = req.params.id;

    await query("UPDATE organizations SET subscription_status = 'active' WHERE id = $1", [orgId]);

    await logSuperadminAction({
      userId: req.user.id,
      action: 'WORKSPACE_ACTIVATE',
      targetType: 'organization',
      targetId: orgId,
      details: {},
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, message: 'Workspace reactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/superadmin/tenants/:id
router.delete('/tenants/:id', async (req, res) => {
  try {
    const orgId = req.params.id;
    if (parseInt(orgId, 10) === 1) {
      return res.status(400).json({ error: 'Cannot delete the primary system organization' });
    }

    const orgRes = await query('SELECT name, slug FROM organizations WHERE id = $1', [orgId]);
    if (orgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const orgName = orgRes.rows[0].name;

    await query('DELETE FROM organizations WHERE id = $1', [orgId]);

    await logSuperadminAction({
      userId: req.user.id,
      action: 'WORKSPACE_DELETE',
      targetType: 'organization',
      targetId: orgId,
      details: { deletedName: orgName },
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, message: `Workspace "${orgName}" deleted permanently` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/billing/run-reminder-check
router.post('/billing/run-reminder-check', async (req, res) => {
  try {
    const results = await checkBillingReminders();
    await logSuperadminAction({
      userId: req.user.id,
      action: 'BILLING_REMINDER_CHECK',
      targetType: 'system',
      targetId: null,
      details: { triggeredCount: results.length },
      ipAddress: getClientIp(req)
    });
    res.json({ success: true, triggeredReminders: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 2. GLOBAL USER MANAGEMENT & ACCESS CONTROL
// =========================================================================

// GET /api/superadmin/users
// Fetch all platform users across all workspaces with search, role filtering & pagination
router.get('/users', async (req, res) => {
  try {
    const { search = '', role = 'all', orgId, isLocked, limit = 50, offset = 0 } = req.query;

    let conditions = ['1=1'];
    let params = [];
    let pIdx = 1;

    if (search.trim()) {
      conditions.push(`(u.name ILIKE $${pIdx} OR u.email ILIKE $${pIdx})`);
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    if (role && role !== 'all') {
      conditions.push(`u.role = $${pIdx}`);
      params.push(role);
      pIdx++;
    }

    if (orgId) {
      conditions.push(`(u.organization_id = $${pIdx} OR EXISTS (SELECT 1 FROM organization_users ou WHERE ou.user_id = u.id AND ou.organization_id = $${pIdx}))`);
      params.push(parseInt(orgId, 10));
      pIdx++;
    }

    if (isLocked !== undefined && isLocked !== '') {
      conditions.push(`u.is_locked = $${pIdx}`);
      params.push(isLocked === 'true');
      pIdx++;
    }

    const whereClause = conditions.join(' AND ');

    // Total count
    const countRes = await query(`SELECT COUNT(*)::int as total FROM users u WHERE ${whereClause}`, params);
    const total = countRes.rows[0].total;

    // Users with primary org and assigned orgs array
    const usersQuery = `
      SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.role, 
        u.organization_id, 
        u.is_locked, 
        u.last_login_at, 
        u.token_version, 
        u.created_at,
        o.name AS primary_organization_name,
        o.slug AS primary_organization_slug,
        COALESCE(
          json_agg(
            json_build_object(
              'organization_id', ou_org.id,
              'organization_name', ou_org.name,
              'organization_slug', ou_org.slug,
              'role', ou.role
            )
          ) FILTER (WHERE ou_org.id IS NOT NULL), '[]'::json
        ) AS workspaces
      FROM users u
      LEFT JOIN organizations o ON o.id = u.organization_id
      LEFT JOIN organization_users ou ON ou.user_id = u.id
      LEFT JOIN organizations ou_org ON ou_org.id = ou.organization_id
      WHERE ${whereClause}
      GROUP BY u.id, o.name, o.slug
      ORDER BY u.created_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;

    params.push(parseInt(limit, 10));
    params.push(parseInt(offset, 10));

    const usersRes = await query(usersQuery, params);

    res.json({
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      users: usersRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/users
// Create a new user globally with specified role and initial workspace
router.post('/users', async (req, res) => {
  try {
    let { email, password, name, role = 'viewer', organization_id } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    email = email.trim().toLowerCase();

    // Check email uniqueness
    const checkRes = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ error: 'A user account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const orgId = organization_id ? parseInt(organization_id, 10) : null;

    const userRes = await query(`
      INSERT INTO users (email, password_hash, name, role, organization_id, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, email, name, role, organization_id, is_locked, created_at
    `, [email, passwordHash, name.trim(), role, orgId]);

    const newUser = userRes.rows[0];

    // If org assigned, link in organization_users
    if (orgId) {
      await query(
        'INSERT INTO organization_users (organization_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [orgId, newUser.id, role === 'superadmin' ? 'admin' : role]
      );
    }

    await logSuperadminAction({
      userId: req.user.id,
      action: 'USER_CREATE',
      targetType: 'user',
      targetId: newUser.id,
      details: { email: newUser.email, role: newUser.role, organization_id: orgId },
      ipAddress: getClientIp(req)
    });

    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/superadmin/users/:id
// Update user metadata, role, or locked status
router.put('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    let { name, email, role, is_locked, organization_id } = req.body;

    const currentRes = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const current = currentRes.rows[0];

    // Prevent demoting or locking oneself
    if (parseInt(userId, 10) === req.user.id) {
      if (role && role !== 'superadmin') {
        return res.status(400).json({ error: 'You cannot demote your own superadmin account' });
      }
      if (is_locked === true) {
        return res.status(400).json({ error: 'You cannot lock your own superadmin account' });
      }
    }

    if (email) {
      email = email.trim().toLowerCase();
      const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id <> $2', [email, userId]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email address is already in use by another account' });
      }
    }

    const updatedRes = await query(`
      UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        role = COALESCE($3, role),
        is_locked = COALESCE($4, is_locked),
        organization_id = COALESCE($5, organization_id)
      WHERE id = $6
      RETURNING id, email, name, role, organization_id, is_locked, last_login_at, created_at
    `, [
      name ? name.trim() : null,
      email || null,
      role || null,
      is_locked !== undefined ? Boolean(is_locked) : null,
      organization_id !== undefined ? (organization_id ? parseInt(organization_id, 10) : null) : null,
      userId
    ]);

    const updated = updatedRes.rows[0];

    await logSuperadminAction({
      userId: req.user.id,
      action: 'USER_UPDATE',
      targetType: 'user',
      targetId: userId,
      details: { previous: { role: current.role, is_locked: current.is_locked }, updated: { role: updated.role, is_locked: updated.is_locked } },
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/users/:id/reset-password
// Set a new password or temporary password for a user
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const userId = req.params.id;
    const { new_password } = req.body;

    if (!new_password || new_password.trim().length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(new_password.trim(), salt);

    const result = await query(
      'UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2 RETURNING id, email',
      [passwordHash, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logSuperadminAction({
      userId: req.user.id,
      action: 'USER_PASSWORD_RESET',
      targetType: 'user',
      targetId: userId,
      details: { targetEmail: result.rows[0].email },
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, message: `Password reset successfully for ${result.rows[0].email}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/superadmin/users/:id/workspaces
// Fetch all workspace memberships for a user
router.get('/users/:id/workspaces', async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await query(`
      SELECT 
        o.id as organization_id, 
        o.name as organization_name, 
        o.slug as organization_slug, 
        o.event_title,
        ou.role as assigned_role,
        CASE WHEN LOWER(TRIM(o.creator_email)) = LOWER(TRIM(u.email)) THEN true ELSE false END as is_creator
      FROM organization_users ou
      JOIN organizations o ON o.id = ou.organization_id
      JOIN users u ON u.id = ou.user_id
      WHERE ou.user_id = $1
      ORDER BY o.name ASC
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/users/:id/workspaces
// Sync / assign a user to a workspace with a role
router.post('/users/:id/workspaces', async (req, res) => {
  try {
    const userId = req.params.id;
    const { organization_id, role = 'admin', remove = false } = req.body;

    if (!organization_id) {
      return res.status(400).json({ error: 'organization_id is required' });
    }

    const orgId = parseInt(organization_id, 10);

    if (remove) {
      await query('DELETE FROM organization_users WHERE user_id = $1 AND organization_id = $2', [userId, orgId]);
      await logSuperadminAction({
        userId: req.user.id,
        action: 'USER_WORKSPACE_REMOVE',
        targetType: 'user',
        targetId: userId,
        details: { organization_id: orgId },
        ipAddress: getClientIp(req)
      });
      return res.json({ success: true, message: 'User removed from workspace' });
    }

    await query(`
      INSERT INTO organization_users (user_id, organization_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (organization_id, user_id) 
      DO UPDATE SET role = EXCLUDED.role
    `, [userId, orgId, role]);

    await logSuperadminAction({
      userId: req.user.id,
      action: 'USER_WORKSPACE_ASSIGN',
      targetType: 'user',
      targetId: userId,
      details: { organization_id: orgId, role },
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, message: 'User workspace access updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/superadmin/users/:id
// Delete a user permanently from the entire platform
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    if (parseInt(userId, 10) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own superadmin account' });
    }

    const userRes = await query('SELECT email, name, role FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = userRes.rows[0];

    await query('DELETE FROM users WHERE id = $1', [userId]);

    await logSuperadminAction({
      userId: req.user.id,
      action: 'USER_DELETE',
      targetType: 'user',
      targetId: userId,
      details: { deletedEmail: targetUser.email, deletedName: targetUser.name },
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, message: `User "${targetUser.name}" (${targetUser.email}) deleted permanently` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 3. GLOBAL PLATFORM SETTINGS ENGINE
// =========================================================================

// GET /api/superadmin/settings
// Fetch all platform parameters grouped by category
router.get('/settings', async (req, res) => {
  try {
    const result = await query('SELECT key, value, category, description, updated_at FROM platform_settings ORDER BY category, key ASC');
    
    // Group by category
    const grouped = {};
    result.rows.forEach(item => {
      const cat = item.category || 'general';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    res.json({
      settings: result.rows,
      by_category: grouped
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/superadmin/settings
// Batch update platform parameters
router.put('/settings', async (req, res) => {
  try {
    const { settings } = req.body; // { key: value, ... }

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings object required' });
    }

    const updatedKeys = [];
    for (const [key, value] of Object.entries(settings)) {
      await query(`
        INSERT INTO platform_settings (key, value, updated_at, updated_by)
        VALUES ($1, $2, NOW(), $3)
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
      `, [key, String(value), req.user.id]);
      updatedKeys.push(key);
    }

    await logSuperadminAction({
      userId: req.user.id,
      action: 'SETTINGS_UPDATE',
      targetType: 'setting',
      targetId: 'batch',
      details: { updatedKeys },
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, message: `Updated ${updatedKeys.length} settings`, updatedKeys });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 4. AUDIT LOGS & SYSTEM HEALTH
// =========================================================================

// GET /api/superadmin/audit-logs
// Paginated audit activity stream
router.get('/audit-logs', async (req, res) => {
  try {
    const { limit = 50, offset = 0, action, targetType } = req.query;

    let conditions = ['1=1'];
    let params = [];
    let pIdx = 1;

    if (action) {
      conditions.push(`l.action = $${pIdx}`);
      params.push(action);
      pIdx++;
    }

    if (targetType) {
      conditions.push(`l.target_type = $${pIdx}`);
      params.push(targetType);
      pIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await query(`SELECT COUNT(*)::int as total FROM superadmin_audit_logs l WHERE ${whereClause}`, params);
    const total = countRes.rows[0].total;

    const logsQuery = `
      SELECT 
        l.id, 
        l.user_id, 
        l.action, 
        l.target_type, 
        l.target_id, 
        l.details, 
        l.ip_address, 
        l.created_at,
        u.name AS actor_name,
        u.email AS actor_email,
        u.role AS actor_role
      FROM superadmin_audit_logs l
      LEFT JOIN users u ON u.id = l.user_id
      WHERE ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;

    params.push(parseInt(limit, 10));
    params.push(parseInt(offset, 10));

    const logsRes = await query(logsQuery, params);

    res.json({
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      logs: logsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/superadmin/system/health
// System telemetry, database metrics, and row counts
router.get('/system/health', async (req, res) => {
  try {
    const [
      dbSizeRes,
      tenantsCountRes,
      usersCountRes,
      fixturesCountRes,
      teamsCountRes,
      feedCountRes,
      auditCountRes
    ] = await Promise.all([
      query("SELECT pg_size_pretty(pg_database_size(current_database())) as size"),
      query("SELECT COUNT(*)::int as total, count(*) FILTER (WHERE subscription_status = 'active')::int as active FROM organizations"),
      query("SELECT COUNT(*)::int as total, count(*) FILTER (WHERE role = 'superadmin')::int as superadmins FROM users"),
      query("SELECT COUNT(*)::int as total, count(*) FILTER (WHERE status = 'completed')::int as completed FROM fixtures"),
      query("SELECT COUNT(*)::int as total FROM teams"),
      query("SELECT COUNT(*)::int as total FROM spectator_feed_posts"),
      query("SELECT COUNT(*)::int as total FROM superadmin_audit_logs")
    ]);

    const memory = process.memoryUsage();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      node_version: process.version,
      uptime_seconds: Math.round(process.uptime()),
      database: {
        size: dbSizeRes.rows[0]?.size || 'Unknown',
        connected: true
      },
      counts: {
        organizations_total: tenantsCountRes.rows[0].total,
        organizations_active: tenantsCountRes.rows[0].active,
        users_total: usersCountRes.rows[0].total,
        superadmins: usersCountRes.rows[0].superadmins,
        fixtures_total: fixturesCountRes.rows[0].total,
        fixtures_completed: fixturesCountRes.rows[0].completed,
        teams_total: teamsCountRes.rows[0].total,
        spectator_feed_posts: feedCountRes.rows[0].total,
        audit_logs: auditCountRes.rows[0].total
      },
      memory_mb: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heap_used: Math.round(memory.heapUsed / 1024 / 1024),
        heap_total: Math.round(memory.heapTotal / 1024 / 1024)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
