import { query } from '../db.js';

export async function tenantMiddleware(req, res, next) {
  try {
    const path = req.path;
    const slugHeader = req.headers['x-organization-slug'];

    if (path.startsWith('/api/organizations') || path === '/api/health') {
      if (slugHeader) {
        try {
          const orgRes = await query(
            'SELECT id, name, slug, event_title, creator_email, billing_school_name, billing_address, billing_contact_person, billing_contact_number FROM organizations WHERE slug = $1',
            [slugHeader]
          );
          if (orgRes.rows.length > 0) {
            req.orgId = orgRes.rows[0].id;
            req.orgSlug = slugHeader;
            req.orgInfo = orgRes.rows[0];
          }
        } catch {}
      }
      return next();
    }

    const slug = slugHeader || 'demo-tournament';

    const orgRes = await query(
      'SELECT id, name, slug, event_title, creator_email, billing_school_name, billing_address, billing_contact_person, billing_contact_number FROM organizations WHERE slug = $1',
      [slug]
    );
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
