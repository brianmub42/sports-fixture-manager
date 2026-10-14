import { query } from '../db.js';
import jwt from 'jsonwebtoken';

export async function billingMiddleware(req, res, next) {
  try {
    // 1. Bypass check (.env flag only)
    const bypassEnv = process.env.BYPASS_BILLING === 'true';

    if (bypassEnv) {
      return next();
    }

    // 2. Exempt authentication, superadmin, and POP upload endpoints from billing lock
    const url = req.originalUrl || req.url || '';
    if (
      url.includes('/api/auth') ||
      url.includes('/api/superadmin') ||
      url.includes('/api/upload/pop') ||
      url.includes('/api/organizations')
    ) {
      return next();
    }

    // 3. Superadmins bypass all billing checks across all workspaces
    if (req.user && req.user.role === 'superadmin') {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.decode(token);
        if (decoded && decoded.role === 'superadmin') {
          return next();
        }
      } catch {}
    }

    // 4. If no workspace is resolved yet, skip verification
    if (!req.orgId) {
      return next();
    }

    // 3. Query workspace subscription details
    const orgRes = await query(
      'SELECT subscription_status, term_expires_at FROM organizations WHERE id = $1',
      [req.orgId]
    );

    if (orgRes.rows.length === 0) {
      return next();
    }

    const org = orgRes.rows[0];
    const expiresAt = org.term_expires_at ? new Date(org.term_expires_at) : null;
    let status = org.subscription_status || 'active';

    // 4. Auto-expire active subscription to grace_period, and suspend if grace period has also expired
    const graceDays = parseInt(process.env.GRACE_PERIOD_DAYS || '3', 10);
    const gracePeriodMs = graceDays * 24 * 60 * 60 * 1000;
    const now = new Date();

    if (expiresAt) {
      const graceExpiresAt = new Date(expiresAt.getTime() + gracePeriodMs);

      if (now >= graceExpiresAt) {
        if (status === 'active' || status === 'grace_period') {
          await query(
            "UPDATE organizations SET subscription_status = 'suspended' WHERE id = $1",
            [req.orgId]
          );
          status = 'suspended';
        }
      } else if (now >= expiresAt) {
        if (status === 'active') {
          await query(
            "UPDATE organizations SET subscription_status = 'grace_period' WHERE id = $1",
            [req.orgId]
          );
          status = 'grace_period';
        }
      }
    }

    // 5. Block write requests if the workspace is suspended
    if (status === 'suspended' && req.method !== 'GET') {
      return res.status(402).json({
        error: 'Workspace subscription has expired. Please make a term payment to reactivate.',
        code: 'SUBSCRIPTION_EXPIRED'
      });
    }

    // Attach billing info to request context for downstream handlers if needed
    req.billing = {
      status,
      expiresAt,
      isExpired: expiresAt && expiresAt < new Date()
    };

    next();
  } catch (err) {
    console.error('Billing middleware error:', err);
    res.status(500).json({ error: 'Internal billing verification error' });
  }
}
