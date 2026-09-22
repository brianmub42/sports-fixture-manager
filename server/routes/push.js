import { Router } from 'express';
import { query } from '../db.js';
import { getVapidPublicKey, saveSubscription, removeSubscription, getSubscriptionStatus } from '../services/notificationService.js';

const router = Router();

// GET /api/public/push/vapid-public-key
router.get('/vapid-public-key', async (req, res) => {
  try {
    const key = await getVapidPublicKey();
    res.json({ publicKey: key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/public/push/subscribe
// Fully anonymous: binds push subscription to deviceId and followedId
router.post('/subscribe', async (req, res) => {
  try {
    const { deviceId, platform, eventSlug, followedType, followedId, followedName, subscription, expoPushToken } = req.body;

    if (!deviceId || !platform || !followedId) {
      return res.status(400).json({ error: 'deviceId, platform, and followedId are required' });
    }

    // Resolve organization ID from eventSlug
    let orgId = 1;
    if (eventSlug) {
      const orgRes = await query('SELECT id FROM organizations WHERE slug = $1', [eventSlug]);
      if (orgRes.rows.length > 0) {
        orgId = orgRes.rows[0].id;
      }
    }

    const saved = await saveSubscription({
      orgId,
      deviceId,
      platform,
      followedType: followedType || 'team',
      followedId: parseInt(followedId, 10),
      followedName,
      subscription,
      expoPushToken
    });

    res.json({ success: true, subscription: saved });
  } catch (err) {
    console.error('Error in /api/public/push/subscribe:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/public/push/unsubscribe
router.post('/unsubscribe', async (req, res) => {
  try {
    const { deviceId, platform, eventSlug } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    let orgId = 1;
    if (eventSlug) {
      const orgRes = await query('SELECT id FROM organizations WHERE slug = $1', [eventSlug]);
      if (orgRes.rows.length > 0) {
        orgId = orgRes.rows[0].id;
      }
    }

    await removeSubscription({ orgId, deviceId, platform });
    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/push/status
router.get('/status', async (req, res) => {
  try {
    const { deviceId, eventSlug } = req.query;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    let orgId = 1;
    if (eventSlug) {
      const orgRes = await query('SELECT id FROM organizations WHERE slug = $1', [eventSlug]);
      if (orgRes.rows.length > 0) {
        orgId = orgRes.rows[0].id;
      }
    }

    const status = await getSubscriptionStatus({ orgId, deviceId });
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
