import { query } from '../db.js';

export async function billingMiddleware(req, res, next) {
  try {
    // 1. Bypass check (Headers, Query Parameter, or .env flag)
    const bypassHeader = req.headers['x-bypass-billing'] === 'true';
    const bypassQuery = req.query.bypassBilling === 'true';
    const bypassEnv = process.env.BYPASS_BILLING === 'true';

    if (bypassHeader || bypassQuery || bypassEnv) {
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

    // 4. Auto-expire active subscription if time is up
    if (status === 'active' && expiresAt && expiresAt < new Date()) {
      await query(
        "UPDATE organizations SET subscription_status = 'suspended' WHERE id = $1",
        [req.orgId]
      );
      status = 'suspended';
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
