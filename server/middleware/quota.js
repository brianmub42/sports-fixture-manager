import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

/**
 * Calculate total disk space (in bytes) utilized by an organization's uploaded assets
 * (Team logos, TV advert banners/logos, spectator feed clips/photos, and proof-of-payment receipts).
 *
 * @param {number} orgId
 * @returns {Promise<{ totalBytes: number, usedMb: number, fileCount: number }>}
 */
export async function getWorkspaceStorageUsage(orgId) {
  try {
    if (!orgId) return { totalBytes: 0, usedMb: 0, fileCount: 0 };

    const urlsRes = await query(`
      SELECT logo_url AS url FROM teams WHERE organization_id = $1 AND logo_url IS NOT NULL
      UNION
      SELECT pop_file_url AS url FROM organizations WHERE id = $1 AND pop_file_url IS NOT NULL
      UNION
      SELECT banner_url AS url FROM tv_adverts WHERE organization_id = $1 AND banner_url IS NOT NULL
      UNION
      SELECT logo_url AS url FROM tv_adverts WHERE organization_id = $1 AND logo_url IS NOT NULL
      UNION
      SELECT media_url AS url FROM spectator_feed_posts WHERE organization_id = $1 AND media_url IS NOT NULL
      UNION
      SELECT thumbnail_url AS url FROM spectator_feed_posts WHERE organization_id = $1 AND thumbnail_url IS NOT NULL
    `, [orgId]);

    let totalBytes = 0;
    let fileCount = 0;
    const seenFiles = new Set();

    for (const row of urlsRes.rows) {
      if (!row.url) continue;
      // Extract clean filename from URL (e.g. /uploads/abcd123.jpg or uploads/abcd123.jpg)
      const relative = row.url.replace(/^(\/)?uploads\//, '');
      if (!relative || seenFiles.has(relative)) continue;
      seenFiles.add(relative);

      const filePath = path.join(UPLOADS_DIR, relative);
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          totalBytes += stats.size;
          fileCount++;
        }
      } catch (fileErr) {
        // Ignore unreadable or dangling file paths
      }
    }

    const usedMb = totalBytes / (1024 * 1024);
    return {
      totalBytes,
      usedMb: parseFloat(usedMb.toFixed(2)),
      fileCount
    };
  } catch (err) {
    console.error('Error calculating workspace storage usage:', err.message);
    return { totalBytes: 0, usedMb: 0, fileCount: 0 };
  }
}

/**
 * Retrieve comprehensive quota limits, current usage and utilization percentages for a workspace.
 *
 * @param {number} orgId
 * @returns {Promise<Object>}
 */
export async function getWorkspaceQuotaStats(orgId) {
  if (!orgId) return null;

  const [orgRes, teamsRes, sportsRes, storage] = await Promise.all([
    query('SELECT id, name, slug, max_teams, max_sports, storage_quota_mb, maintenance_mode FROM organizations WHERE id = $1', [orgId]),
    query('SELECT COUNT(*)::int as count FROM teams WHERE organization_id = $1', [orgId]),
    query('SELECT COUNT(*)::int as count FROM sports WHERE organization_id = $1', [orgId]),
    getWorkspaceStorageUsage(orgId)
  ]);

  if (orgRes.rows.length === 0) return null;
  const org = orgRes.rows[0];

  const maxTeams = org.max_teams || 20;
  const maxSports = org.max_sports || 10;
  const storageLimitMb = org.storage_quota_mb || 500;

  const teamsCount = teamsRes.rows[0].count;
  const sportsCount = sportsRes.rows[0].count;

  return {
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      maintenance_mode: Boolean(org.maintenance_mode)
    },
    teams: {
      current: teamsCount,
      limit: maxTeams,
      percentage: Math.min(100, Math.round((teamsCount / maxTeams) * 100)),
      isExceeded: teamsCount >= maxTeams
    },
    sports: {
      current: sportsCount,
      limit: maxSports,
      percentage: Math.min(100, Math.round((sportsCount / maxSports) * 100)),
      isExceeded: sportsCount >= maxSports
    },
    storage: {
      usedBytes: storage.totalBytes,
      usedMb: storage.usedMb,
      limitMb: storageLimitMb,
      percentage: Math.min(100, Math.round((storage.usedMb / storageLimitMb) * 100)),
      fileCount: storage.fileCount,
      isExceeded: storage.usedMb >= storageLimitMb
    }
  };
}

/**
 * Helper to check if caller has superadmin role either in req.user or via token
 */
function isCallerSuperadmin(req) {
  if (req.user && req.user.role === 'superadmin') return true;
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.decode(authHeader.split(' ')[1]);
      if (decoded && decoded.role === 'superadmin') return true;
    } catch {}
  }
  return false;
}

/**
 * Middleware: Enforces maximum allowed teams per workspace.
 */
export async function checkTeamQuota(req, res, next) {
  try {
    if (isCallerSuperadmin(req)) return next();
    if (!req.orgId) return next();

    const maxTeams = req.orgInfo?.max_teams || 20;
    const countRes = await query('SELECT COUNT(*)::int as count FROM teams WHERE organization_id = $1', [req.orgId]);
    const currentCount = countRes.rows[0]?.count || 0;

    if (currentCount >= maxTeams) {
      return res.status(403).json({
        error: `Workspace team quota reached (${currentCount}/${maxTeams} teams). Upgrade workspace limit in Superadmin to create more teams.`,
        code: 'QUOTA_EXCEEDED_TEAMS',
        limit: maxTeams,
        current: currentCount
      });
    }

    next();
  } catch (err) {
    console.error('Team quota check error:', err);
    next();
  }
}

/**
 * Middleware: Enforces maximum allowed sports per workspace.
 */
export async function checkSportQuota(req, res, next) {
  try {
    if (isCallerSuperadmin(req)) return next();
    if (!req.orgId) return next();

    const maxSports = req.orgInfo?.max_sports || 10;
    const countRes = await query('SELECT COUNT(*)::int as count FROM sports WHERE organization_id = $1', [req.orgId]);
    const currentCount = countRes.rows[0]?.count || 0;

    if (currentCount >= maxSports) {
      return res.status(403).json({
        error: `Workspace sport quota reached (${currentCount}/${maxSports} sports). Upgrade workspace limit in Superadmin to add more sports.`,
        code: 'QUOTA_EXCEEDED_SPORTS',
        limit: maxSports,
        current: currentCount
      });
    }

    next();
  } catch (err) {
    console.error('Sport quota check error:', err);
    next();
  }
}

/**
 * Middleware: Enforces storage capacity limit (in MB) on file uploads.
 * Place after multer so req.file is available.
 */
export async function checkStorageQuota(req, res, next) {
  try {
    if (isCallerSuperadmin(req)) return next();
    if (!req.orgId || !req.file) return next();

    const quotaMb = req.orgInfo?.storage_quota_mb || 500;
    const maxBytes = quotaMb * 1024 * 1024;

    const currentUsage = await getWorkspaceStorageUsage(req.orgId);
    const newFileBytes = req.file.size || 0;
    const projectedBytes = currentUsage.totalBytes + newFileBytes;

    if (projectedBytes > maxBytes) {
      // Clean up the rejected file from uploads directory
      if (req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkErr) {
          console.error('Failed to unlink rejected upload file:', unlinkErr.message);
        }
      }

      const currentMb = currentUsage.usedMb;
      const fileMb = (newFileBytes / (1024 * 1024)).toFixed(2);

      return res.status(413).json({
        error: `Storage quota exceeded for this workspace. Used ${currentMb} MB of ${quotaMb} MB limit (upload was ${fileMb} MB). Please remove old media or contact superadmin to increase quota.`,
        code: 'QUOTA_EXCEEDED_STORAGE',
        limitMb: quotaMb,
        usedMb: currentMb
      });
    }

    next();
  } catch (err) {
    console.error('Storage quota check error:', err);
    next();
  }
}

/**
 * Middleware: Checks both global platform maintenance and per-workspace maintenance mode.
 */
export async function checkMaintenanceMode(req, res, next) {
  try {
    const url = req.originalUrl || req.url || '';

    // Always exempt authentication, superadmin, static uploads and health check
    if (
      url.includes('/api/auth') ||
      url.includes('/api/superadmin') ||
      url.startsWith('/uploads') ||
      url === '/api/health'
    ) {
      return next();
    }

    // Superadmins can access in any maintenance mode
    if (isCallerSuperadmin(req)) {
      return next();
    }

    // 1. Check workspace-level maintenance mode
    if (req.orgInfo && req.orgInfo.maintenance_mode === true) {
      return res.status(503).json({
        error: `Workspace "${req.orgInfo.name}" is currently under maintenance by administrators. Please check back shortly.`,
        code: 'WORKSPACE_MAINTENANCE'
      });
    }

    // 2. Check global platform maintenance mode
    try {
      const modeRes = await query("SELECT value FROM platform_settings WHERE key = 'maintenance_mode'");
      if (modeRes.rows.length > 0 && modeRes.rows[0].value === 'true') {
        const msgRes = await query("SELECT value FROM platform_settings WHERE key = 'maintenance_message'");
        const notice = msgRes.rows[0]?.value || 'Platform undergoing scheduled maintenance. Please check back shortly.';
        return res.status(503).json({
          error: notice,
          code: 'PLATFORM_MAINTENANCE'
        });
      }
    } catch (platformErr) {
      // Non-blocking if platform_settings table query has issue
    }

    next();
  } catch (err) {
    console.error('Maintenance mode check error:', err);
    next();
  }
}
