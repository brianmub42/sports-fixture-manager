import { query } from '../db.js';

export async function tenantMiddleware(req, res, next) {
  try {
    const path = req.path;
    if (path === '/api/organizations' || path.startsWith('/api/auth') || path === '/api/health') {
      return next();
    }

    const slugHeader = req.headers['x-organization-slug'];
    const slug = slugHeader || 'kalife-2026';

    const orgRes = await query('SELECT id, name, event_title FROM organizations WHERE slug = $1', [slug]);
    if (orgRes.rows.length === 0) {
      return res.status(404).json({ error: `Organization not found: ${slug}` });
    }

    req.orgId = orgRes.rows[0].id;
    req.orgSlug = slug;
    req.orgInfo = orgRes.rows[0];
    next();
  } catch (err) {
    console.error('Tenant middleware error:', err);
    res.status(500).json({ error: 'Internal tenant resolution error' });
  }
}
