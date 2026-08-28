import { query } from '../db.js';

export async function billingMiddleware(req, res, next) {
  try {
    // 1. Bypass check (.env flag only)
    const bypassEnv = process.env.BYPASS_BILLING === 'true';

    if (bypassEnv) {
      return next();
    }

    // 2. If no workspace is resolved yet, skip verification
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
