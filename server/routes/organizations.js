import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/organizations
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT id, name, slug, event_title, created_at FROM organizations ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/organizations
router.post('/', async (req, res) => {
  try {
    const { name, event_title } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Organization name is required' });
    }

    // Generate unique slug
    let slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!slug) slug = 'org';

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
    slug = candidateSlug;

    // Create organization
    const orgRes = await query(
      'INSERT INTO organizations (name, slug, event_title) VALUES ($1, $2, $3) RETURNING *',
      [name, slug, event_title || 'Championship']
    );
    const org = orgRes.rows[0];

    // Seed default settings for this organization
    await query(
      "INSERT INTO settings (organization_id, key, value) VALUES ($1, 'org_name', $2), ($1, 'event_title', $3)",
      [org.id, name, event_title || 'Championship']
    );

    res.status(201).json(org);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
