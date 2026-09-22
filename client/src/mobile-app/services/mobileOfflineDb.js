// Native IndexedDB-backed offline storage engine mirroring mobile SQLite schema
const DB_NAME = 'fixturegrid_mobile_web_db';
const DB_VERSION = 1;

let dbPromise = null;

export function getDatabase() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. Fixtures store
        if (!db.objectStoreNames.contains('fixtures')) {
          const fixStore = db.createObjectStore('fixtures', { keyPath: 'id' });
          fixStore.createIndex('sport_id', 'sport_id', { unique: false });
          fixStore.createIndex('status', 'status', { unique: false });
        }

        // 2. Teams store
        if (!db.objectStoreNames.contains('teams')) {
          db.createObjectStore('teams', { keyPath: 'id' });
        }

        // 3. Sports store
        if (!db.objectStoreNames.contains('sports')) {
          db.createObjectStore('sports', { keyPath: 'id' });
        }

        // 4. Sync Queue store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
          queueStore.createIndex('uuid', 'uuid', { unique: true });
          queueStore.createIndex('status', 'status', { unique: false });
          queueStore.createIndex('fixture_id', 'fixture_id', { unique: false });
        }

        // 5. Cached Standings store
        if (!db.objectStoreNames.contains('cached_standings')) {
          db.createObjectStore('cached_standings', { keyPath: 'key' });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

export async function initMobileDb() {
  const db = await getDatabase();
  console.log('[IndexedDB] Mobile Web App database initialized:', db.name);
  return db;
}

// Cache online metadata into IndexedDB
export async function cacheEventData(fixtures = [], teams = [], sports = []) {
  const db = await getDatabase();
  const tx = db.transaction(['fixtures', 'teams', 'sports'], 'readwrite');

  const fixStore = tx.objectStore('fixtures');
  const teamStore = tx.objectStore('teams');
  const sportStore = tx.objectStore('sports');

  // Clear existing caches
  fixStore.clear();
  teamStore.clear();
  sportStore.clear();

  // Populate teams
  for (const t of teams) {
    teamStore.put({
      id: t.id,
      code: t.code,
      name: t.name,
      color: t.color || '#3b82f6',
      logo_url: t.logo_url || null
    });
  }

  // Populate sports
  for (const s of sports) {
    sportStore.put({
      id: s.id,
      name: s.name,
      scoring_type: s.scoring_type || 'points'
    });
  }

  // Populate fixtures
  for (const f of fixtures) {
    fixStore.put({
      id: f.id,
      sport_id: f.sport_id,
      sport_name: f.sport_name,
      team_a_id: f.team_a_id,
      team_a_code: f.team_a_code || f.team_a_name?.substring(0, 3).toUpperCase(),
      team_a_name: f.team_a_name,
      team_a_color: f.team_a_color || '#2563eb',
      team_b_id: f.team_b_id,
      team_b_code: f.team_b_code || f.team_b_name?.substring(0, 3).toUpperCase(),
      team_b_name: f.team_b_name,
      team_b_color: f.team_b_color || '#dc2626',
      score_a: f.score_a,
      score_b: f.score_b,
      status: f.status || 'upcoming',
      round: f.round || 'Round 1',
      venue_name: f.venue_name || f.venue || 'Main Court',
      submitted_by: f.submitted_by || null,
      submitted_at: f.submitted_at || null,
    });
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      console.log(`[IndexedDB] Cached ${fixtures.length} fixtures, ${teams.length} teams, ${sports.length} sports`);
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

// Retrieve offline fixtures
export async function getOfflineFixtures() {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('fixtures', 'readonly');
    const req = tx.objectStore('fixtures').getAll();
    req.onsuccess = () => {
      const items = req.result || [];
      // Sort status ('live' > 'upcoming' > 'completed') then round
      items.sort((a, b) => {
        const order = { live: 0, upcoming: 1, draw: 2, completed: 3 };
        const oA = order[a.status] ?? 99;
        const oB = order[b.status] ?? 99;
        if (oA !== oB) return oA - oB;
        return (a.round || '').localeCompare(b.round || '');
      });
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

// Retrieve offline teams & sports
export async function getOfflineTeams() {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('teams', 'readonly');
    const req = tx.objectStore('teams').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineSports() {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sports', 'readonly');
    const req = tx.objectStore('sports').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// Save result offline (enqueue to sync_queue and update local fixture cache optimistically)
export async function saveFixtureResultOffline(uuid, fixtureId, scoreA, scoreB, playerId = null, pointsScored = null) {
  const db = await getDatabase();
  const tx = db.transaction(['sync_queue', 'fixtures'], 'readwrite');

  const queueStore = tx.objectStore('sync_queue');
  const fixStore = tx.objectStore('fixtures');

  // 1. Add to sync queue
  queueStore.put({
    uuid,
    fixture_id: Number(fixtureId),
    score_a: Number(scoreA),
    score_b: Number(scoreB),
    player_id: playerId ? Number(playerId) : null,
    points_scored: pointsScored ? Number(pointsScored) : null,
    status: 'pending_sync',
    conflict_reason: null,
    created_at: new Date().toISOString()
  });

  // 2. Optimistic update in fixtures store
  const fixReq = fixStore.get(Number(fixtureId));
  fixReq.onsuccess = () => {
    if (fixReq.result) {
      const updated = {
        ...fixReq.result,
        score_a: Number(scoreA),
        score_b: Number(scoreB),
        status: 'completed',
        submitted_at: new Date().toISOString()
      };
      fixStore.put(updated);
    }
  };

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      console.log(`[IndexedDB] Result queued and fixture ${fixtureId} updated optimistically`);
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

// Retrieve pending queue items
export async function getPendingSyncQueue() {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');
    const index = store.index('status');
    const req = index.getAll('pending_sync');
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// Retrieve sync queue history
export async function getSyncQueueHistory(limit = 50) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readonly');
    const req = tx.objectStore('sync_queue').getAll();
    req.onsuccess = () => {
      const items = (req.result || []).reverse().slice(0, limit);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

// Update queue status
export async function updateQueueStatus(id, status, conflictReason = null) {
  const db = await getDatabase();
  const tx = db.transaction('sync_queue', 'readwrite');
  const store = tx.objectStore('sync_queue');

  const req = store.get(id);
  req.onsuccess = () => {
    if (req.result) {
      const updated = {
        ...req.result,
        status,
        conflict_reason: conflictReason,
        synced_at: new Date().toISOString()
      };
      store.put(updated);
    }
  };

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Overwrite local fixture score (manual conflict resolution)
export async function overwriteLocalFixtureScore(fixtureId, scoreA, scoreB) {
  const db = await getDatabase();
  const tx = db.transaction('fixtures', 'readwrite');
  const store = tx.objectStore('fixtures');

  const req = store.get(Number(fixtureId));
  req.onsuccess = () => {
    if (req.result) {
      const updated = {
        ...req.result,
        score_a: Number(scoreA),
        score_b: Number(scoreB),
        status: 'completed'
      };
      store.put(updated);
    }
  };

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Clear all offline cache
export async function clearOfflineCache() {
  const db = await getDatabase();
  const tx = db.transaction(['fixtures', 'teams', 'sports', 'sync_queue', 'cached_standings'], 'readwrite');
  tx.objectStore('fixtures').clear();
  tx.objectStore('teams').clear();
  tx.objectStore('sports').clear();
  tx.objectStore('sync_queue').clear();
  tx.objectStore('cached_standings').clear();

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Cached Standings helpers
export async function getCachedStandings(key = 'overall') {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cached_standings', 'readonly');
    const req = tx.objectStore('cached_standings').get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCachedStandings(key = 'overall', data = []) {
  const db = await getDatabase();
  const tx = db.transaction('cached_standings', 'readwrite');
  const store = tx.objectStore('cached_standings');
  store.put({
    key,
    data,
    updatedAt: new Date().toISOString()
  });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Clear synced queue history
export async function clearSyncedQueueHistory() {
  const db = await getDatabase();
  const tx = db.transaction('sync_queue', 'readwrite');
  const store = tx.objectStore('sync_queue');
  const req = store.openCursor();
  req.onsuccess = (e) => {
    const cursor = e.target.result;
    if (cursor) {
      if (cursor.value.status !== 'pending_sync') {
        cursor.delete();
      }
      cursor.continue();
    }
  };
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Helper DB wrapper for diagnostic stats
export async function getOfflineDb() {
  const db = await getDatabase();
  return {
    raw: db,
    count: (storeName) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).count();
        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = () => reject(req.error);
      }),
    getAll: (storeName) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      }),
  };
}
