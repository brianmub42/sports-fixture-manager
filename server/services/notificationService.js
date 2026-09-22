import webpush from 'web-push';
import axios from 'axios';
import { query } from '../db.js';

let vapidInitialized = false;
let currentVapidPublicKey = process.env.VAPID_PUBLIC_KEY || null;
let currentVapidPrivateKey = process.env.VAPID_PRIVATE_KEY || null;

// Ensure database table exists
export async function ensurePushTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
        device_id VARCHAR(100) NOT NULL,
        platform VARCHAR(20) NOT NULL,
        followed_type VARCHAR(20) NOT NULL DEFAULT 'team',
        followed_id INT NOT NULL,
        followed_name VARCHAR(100),
        subscription_json TEXT,
        expo_push_token VARCHAR(200),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(organization_id, device_id, platform)
      );

      CREATE INDEX IF NOT EXISTS idx_push_subs_org_team ON push_subscriptions(organization_id, followed_type, followed_id);
      CREATE INDEX IF NOT EXISTS idx_push_subs_device ON push_subscriptions(organization_id, device_id);
    `);
  } catch (err) {
    console.error('[Push Service] Error ensuring push_subscriptions table:', err.message);
  }
}

// Ensure VAPID keys are configured and valid
export async function initVapidKeys() {
  if (vapidInitialized) return currentVapidPublicKey;

  await ensurePushTable();

  try {
    if (!currentVapidPublicKey || !currentVapidPrivateKey) {
      // Check in settings table for a globally stored keypair
      const res = await query("SELECT key, value FROM settings WHERE key IN ('vapid_public_key', 'vapid_private_key') LIMIT 2");
      const settingsMap = {};
      res.rows.forEach(r => { settingsMap[r.key] = r.value; });

      if (settingsMap.vapid_public_key && settingsMap.vapid_private_key) {
        currentVapidPublicKey = settingsMap.vapid_public_key;
        currentVapidPrivateKey = settingsMap.vapid_private_key;
      } else {
        // Generate new stable VAPID keypair
        console.log('[Push Service] Generating new VAPID keys for Web Push...');
        const newKeys = webpush.generateVAPIDKeys();
        currentVapidPublicKey = newKeys.publicKey;
        currentVapidPrivateKey = newKeys.privateKey;

        // Persist keys in settings for the first organization
        const orgRes = await query('SELECT id FROM organizations ORDER BY id ASC LIMIT 1');
        const orgId = orgRes.rows.length > 0 ? orgRes.rows[0].id : 1;

        await query(
          "INSERT INTO settings (organization_id, key, value) VALUES ($1, 'vapid_public_key', $2) ON CONFLICT (organization_id, key) DO UPDATE SET value = $2",
          [orgId, currentVapidPublicKey]
        );
        await query(
          "INSERT INTO settings (organization_id, key, value) VALUES ($1, 'vapid_private_key', $2) ON CONFLICT (organization_id, key) DO UPDATE SET value = $2",
          [orgId, currentVapidPrivateKey]
        );
      }
    }

    const contactEmail = process.env.VAPID_EMAIL || 'mailto:notifications@kalife-sports.com';
    webpush.setVapidDetails(contactEmail, currentVapidPublicKey, currentVapidPrivateKey);
    vapidInitialized = true;
    console.log('[Push Service] Web Push VAPID keys initialized successfully.');
    return currentVapidPublicKey;
  } catch (err) {
    console.error('[Push Service] Failed to initialize VAPID keys:', err);
    return null;
  }
}

// Get VAPID public key
export async function getVapidPublicKey() {
  if (!vapidInitialized) {
    await initVapidKeys();
  }
  return currentVapidPublicKey;
}

// Save or update an anonymous device follow subscription
export async function saveSubscription({
  orgId,
  deviceId,
  platform,
  followedType = 'team',
  followedId,
  followedName,
  subscription,
  expoPushToken
}) {
  await ensurePushTable();
  const subJson = subscription ? (typeof subscription === 'string' ? subscription : JSON.stringify(subscription)) : null;

  const result = await query(`
    INSERT INTO push_subscriptions (
      organization_id, device_id, platform, followed_type, followed_id, followed_name, subscription_json, expo_push_token, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    ON CONFLICT (organization_id, device_id, platform)
    DO UPDATE SET
      followed_type = EXCLUDED.followed_type,
      followed_id = EXCLUDED.followed_id,
      followed_name = EXCLUDED.followed_name,
      subscription_json = COALESCE(EXCLUDED.subscription_json, push_subscriptions.subscription_json),
      expo_push_token = COALESCE(EXCLUDED.expo_push_token, push_subscriptions.expo_push_token),
      updated_at = NOW()
    RETURNING *
  `, [orgId, deviceId, platform, followedType, followedId, followedName, subJson, expoPushToken || null]);

  return result.rows[0];
}

// Remove subscription (unfollow)
export async function removeSubscription({ orgId, deviceId, platform }) {
  await ensurePushTable();
  let sql = 'DELETE FROM push_subscriptions WHERE organization_id = $1 AND device_id = $2';
  const params = [orgId, deviceId];
  if (platform) {
    sql += ' AND platform = $3';
    params.push(platform);
  }
  await query(sql, params);
  return { success: true };
}

// Get subscription status for a device
export async function getSubscriptionStatus({ orgId, deviceId }) {
  await ensurePushTable();
  const res = await query(
    'SELECT followed_type, followed_id, followed_name, platform, updated_at FROM push_subscriptions WHERE organization_id = $1 AND device_id = $2',
    [orgId, deviceId]
  );
  if (res.rows.length === 0) return { active: false, subscription: null };
  return { active: true, subscription: res.rows[0] };
}

// Core dispatcher: delivers to web (via web-push) and mobile (via Expo Push API)
export async function dispatchNotificationToFollowers({ orgId, followedType = 'team', followedId, title, body, data = {} }) {
  try {
    await initVapidKeys();

    const subsRes = await query(
      'SELECT id, platform, subscription_json, expo_push_token FROM push_subscriptions WHERE organization_id = $1 AND followed_type = $2 AND followed_id = $3',
      [orgId, followedType, followedId]
    );

    if (subsRes.rows.length === 0) {
      console.log(`[Push Service] No followers found for ${followedType} #${followedId} in org ${orgId}`);
      return { webSent: 0, mobileSent: 0 };
    }

    const webSubs = subsRes.rows.filter(r => r.platform === 'web' && r.subscription_json);
    const mobileSubs = subsRes.rows.filter(r => r.platform === 'mobile' && r.expo_push_token);

    // 1. Dispatch Web Push Notifications
    let webSuccessCount = 0;
    const expiredSubIds = [];

    const webPayload = JSON.stringify({
      title,
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: data.url || '/'
    });

    for (const subRow of webSubs) {
      try {
        const parsedSub = JSON.parse(subRow.subscription_json);
        await webpush.sendNotification(parsedSub, webPayload);
        webSuccessCount++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredSubIds.push(subRow.id);
        } else {
          console.warn(`[Push Service] Web push failed for device record #${subRow.id}:`, err.message);
        }
      }
    }

    // Clean up expired web push subscriptions
    if (expiredSubIds.length > 0) {
      await query('DELETE FROM push_subscriptions WHERE id = ANY($1)', [expiredSubIds]);
      console.log(`[Push Service] Cleaned up ${expiredSubIds.length} expired web push subscriptions`);
    }

    // 2. Dispatch Mobile Push Notifications (via Expo Push Service)
    let mobileSuccessCount = 0;
    if (mobileSubs.length > 0) {
      const expoMessages = mobileSubs.map(subRow => ({
        to: subRow.expo_push_token,
        sound: 'default',
        title,
        body,
        data,
        channelId: 'scores',
        priority: 'high'
      }));

      try {
        const chunkSize = 100;
        for (let i = 0; i < expoMessages.length; i += chunkSize) {
          const chunk = expoMessages.slice(i, i + chunkSize);
          const response = await axios.post('https://exp.host/--/api/v2/push/send', chunk, {
            headers: {
              Accept: 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
          });
          if (response.data && response.data.data) {
            mobileSuccessCount += response.data.data.filter(item => item.status === 'ok').length;
          }
        }
      } catch (expoErr) {
        console.error('[Push Service] Expo push dispatch error:', expoErr.response?.data || expoErr.message);
      }
    }

    console.log(`[Push Service] Dispatched "${title}" to ${webSuccessCount} web and ${mobileSuccessCount} mobile followers.`);
    return { webSent: webSuccessCount, mobileSent: mobileSuccessCount };
  } catch (err) {
    console.error('[Push Service] dispatchNotificationToFollowers error:', err);
    return { error: err.message };
  }
}

// 1. Notify Score Update for Ball Games / Points-Based Sports
export async function notifyScoreUpdate({ orgId, orgSlug, fixture, oldScoreA, oldScoreB, newScoreA, newScoreB, status }) {
  if (!fixture) return;

  const teamAId = fixture.team_a_id;
  const teamBId = fixture.team_b_id;
  const teamAName = fixture.team_a_name || 'Team A';
  const teamBName = fixture.team_b_name || 'Team B';

  const scoreAChanged = oldScoreA !== newScoreA;
  const scoreBChanged = oldScoreB !== newScoreB;
  const isFinal = status === 'completed' || status === 'draw';

  const watchUrl = `/watch/${orgSlug || 'tournament'}`;

  // Notify Team A Followers
  if (scoreAChanged || isFinal) {
    let title = `${teamAName} Score Update`;
    let body = '';

    if (isFinal) {
      title = `${teamAName} Match Final`;
      body = `${teamAName} vs ${teamBName} final: ${newScoreA} - ${newScoreB}.`;
    } else if (newScoreA > newScoreB) {
      body = `${teamAName} just scored! Now leading with ${newScoreA} - ${newScoreB}.`;
    } else if (newScoreA === newScoreB) {
      body = `${teamAName} just scored! Level at ${newScoreA} - ${newScoreB}.`;
    } else {
      body = `${teamAName} scored! Score is now ${newScoreA} - ${newScoreB} vs ${teamBName}.`;
    }

    dispatchNotificationToFollowers({
      orgId,
      followedType: 'team',
      followedId: teamAId,
      title,
      body,
      data: { url: watchUrl, eventSlug: orgSlug, teamId: teamAId }
    });
  }

  // Notify Team B Followers
  if (scoreBChanged || isFinal) {
    let title = `${teamBName} Score Update`;
    let body = '';

    if (isFinal) {
      title = `${teamBName} Match Final`;
      body = `${teamBName} vs ${teamAName} final: ${newScoreB} - ${newScoreA}.`;
    } else if (newScoreB > newScoreA) {
      body = `${teamBName} just scored! Now leading with ${newScoreB} - ${newScoreA}.`;
    } else if (newScoreB === newScoreA) {
      body = `${teamBName} just scored! Level at ${newScoreB} - ${newScoreA}.`;
    } else {
      body = `${teamBName} scored! Score is now ${newScoreB} - ${newScoreA} vs ${teamAName}.`;
    }

    dispatchNotificationToFollowers({
      orgId,
      followedType: 'team',
      followedId: teamBId,
      title,
      body,
      data: { url: watchUrl, eventSlug: orgSlug, teamId: teamBId }
    });
  }
}

// 2. Notify Placement Results for Athletics / Swimming / Novelty Sports
export async function notifyPlacementResults({ orgId, orgSlug, eventInfo, results }) {
  if (!results || !Array.isArray(results)) return;

  const eventName = eventInfo?.name || 'Event';
  const watchUrl = `/watch/${orgSlug || 'tournament'}`;

  for (const r of results) {
    const teamId = r.teamId;
    const teamName = r.teamName || 'Your team';
    const placement = r.placement;
    const placementStr = placement === 1 ? '1st' : placement === 2 ? '2nd' : placement === 3 ? '3rd' : `${placement}th`;
    const timeOrPts = r.timeFormatted || (r.points ? `+${r.points} pts` : '');

    const title = `${teamName} — ${eventName} Result`;
    const body = `${teamName} just finished — ${placementStr} place${timeOrPts ? `, ${timeOrPts}` : ''} in ${eventName}.`;

    dispatchNotificationToFollowers({
      orgId,
      followedType: 'team',
      followedId: teamId,
      title,
      body,
      data: { url: watchUrl, eventSlug: orgSlug, teamId }
    });
  }
}

// 3. Notify Standings Leader Change (e.g. Taking the lead in the overall tournament)
export async function checkAndNotifyLeaderChange({ orgId, orgSlug }) {
  try {
    const leaderRes = await query(`
      SELECT t.id, t.name, t.code,
        COALESCE(
          (SELECT SUM(ar.points) FROM athletics_results ar JOIN athletics_events ae ON ar.event_id = ae.id WHERE ar.team_id = t.id AND ae.organization_id = $1), 0
        ) as total_points
      FROM teams t
      WHERE t.organization_id = $1
      ORDER BY total_points DESC, t.name ASC
      LIMIT 1
    `, [orgId]);

    if (leaderRes.rows.length === 0) return;
    const newLeader = leaderRes.rows[0];
    if (newLeader.total_points <= 0) return;

    const prevLeaderRes = await query(
      "SELECT value FROM settings WHERE organization_id = $1 AND key = 'previous_tournament_leader'",
      [orgId]
    );

    const prevLeaderId = prevLeaderRes.rows.length > 0 ? parseInt(prevLeaderRes.rows[0].value, 10) : null;

    if (prevLeaderId !== newLeader.id) {
      await query(`
        INSERT INTO settings (organization_id, key, value)
        VALUES ($1, 'previous_tournament_leader', $2)
        ON CONFLICT (organization_id, key)
        DO UPDATE SET value = $2
      `, [orgId, String(newLeader.id)]);

      if (prevLeaderId !== null) {
        const title = `🏆 Leaderboard Change`;
        const body = `${newLeader.name} takes the lead in the standings with ${newLeader.total_points} pts!`;
        const watchUrl = `/watch/${orgSlug || 'tournament'}`;

        dispatchNotificationToFollowers({
          orgId,
          followedType: 'team',
          followedId: newLeader.id,
          title,
          body,
          data: { url: watchUrl, eventSlug: orgSlug, teamId: newLeader.id }
        });
      }
    }
  } catch (err) {
    console.error('[Push Service] checkAndNotifyLeaderChange error:', err);
  }
}
