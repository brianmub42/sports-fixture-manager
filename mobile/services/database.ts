import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('fixturegrid.db');
  }
  return dbInstance;
}

export async function initDatabase(): Promise<void> {
  const db = await getDatabase();

  // Create tables
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      fixture_id INTEGER NOT NULL,
      score_a INTEGER NOT NULL,
      score_b INTEGER NOT NULL,
      player_id INTEGER,
      points_scored INTEGER,
      status TEXT DEFAULT 'pending_sync', -- 'pending_sync', 'synced', 'conflict'
      conflict_reason TEXT, -- Stores JSON string of { score_a, score_b, submittedBy, submittedAt }
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fixtures (
      id INTEGER PRIMARY KEY,
      sport_id INTEGER,
      sport_name TEXT,
      team_a_id INTEGER,
      team_a_code TEXT,
      team_a_name TEXT,
      team_b_id INTEGER,
      team_b_code TEXT,
      team_b_name TEXT,
      score_a INTEGER,
      score_b INTEGER,
      status TEXT,
      round TEXT,
      venue_name TEXT,
      submitted_by TEXT,
      submitted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS sports (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      scoring_type TEXT
    );
  `);

  console.log('[SQLite] Local database initialized successfully');
}

export async function cacheEventData(
  fixtures: any[],
  teams: any[],
  sports: any[]
): Promise<void> {
  const db = await getDatabase();

  // Run in a transaction structure
  await db.withTransactionAsync(async () => {
    // 1. Clear old caches
    await db.runAsync('DELETE FROM fixtures');
    await db.runAsync('DELETE FROM teams');
    await db.runAsync('DELETE FROM sports');

    // 2. Insert teams
    for (const t of teams) {
      await db.runAsync(
        'INSERT OR REPLACE INTO teams (id, code, name, color) VALUES (?, ?, ?, ?)',
        [t.id, t.code, t.name, t.color]
      );
    }

    // 3. Insert sports
    for (const s of sports) {
      await db.runAsync(
        'INSERT OR REPLACE INTO sports (id, name, scoring_type) VALUES (?, ?, ?)',
        [s.id, s.name, s.scoring_type]
      );
    }

    // 4. Insert fixtures
    for (const f of fixtures) {
      await db.runAsync(
        `INSERT OR REPLACE INTO fixtures (
          id, sport_id, sport_name, team_a_id, team_a_code, team_a_name, 
          team_b_id, team_b_code, team_b_name, score_a, score_b, status, 
          round, venue_name, submitted_by, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          f.id,
          f.sport_id,
          f.sport_name,
          f.team_a_id,
          f.team_a_code || f.team_a_name?.substring(0, 3).toUpperCase(),
          f.team_a_name,
          f.team_b_id,
          f.team_b_code || f.team_b_name?.substring(0, 3).toUpperCase(),
          f.team_b_name,
          f.score_a,
          f.score_b,
          f.status,
          f.round,
          f.venue_name,
          f.submitted_by,
          f.submitted_at,
        ]
      );
    }
  });

  console.log('[SQLite] Local metadata and fixtures cache refreshed');
}

export async function getOfflineFixtures(): Promise<any[]> {
  const db = await getDatabase();
  return db.getAllAsync('SELECT * FROM fixtures ORDER BY status DESC, round ASC');
}

export async function getOfflineTeams(): Promise<any[]> {
  const db = await getDatabase();
  return db.getAllAsync('SELECT * FROM teams ORDER BY name ASC');
}

export async function getOfflineSports(): Promise<any[]> {
  const db = await getDatabase();
  return db.getAllAsync('SELECT * FROM sports ORDER BY name ASC');
}

export async function saveFixtureResultOffline(
  uuid: string,
  fixtureId: number,
  scoreA: number,
  scoreB: number,
  playerId?: number | null,
  pointsScored?: number | null
): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    // 1. Insert into local sync queue
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_queue (
        uuid, fixture_id, score_a, score_b, player_id, points_scored, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending_sync')`,
      [uuid, fixtureId, scoreA, scoreB, playerId || null, pointsScored || null]
    );

    // 2. Update local fixtures table cache for optimistic UI presentation
    await db.runAsync(
      'UPDATE fixtures SET score_a = ?, score_b = ?, status = \'completed\' WHERE id = ?',
      [scoreA, scoreB, fixtureId]
    );
  });

  console.log(`[SQLite] Result saved in sync queue and cache updated for fixture ${fixtureId}`);
}

export async function getPendingSyncQueue(): Promise<any[]> {
  const db = await getDatabase();
  return db.getAllAsync('SELECT * FROM sync_queue WHERE status = \'pending_sync\' ORDER BY id ASC');
}

export async function getSyncQueueHistory(): Promise<any[]> {
  const db = await getDatabase();
  return db.getAllAsync('SELECT * FROM sync_queue ORDER BY id DESC LIMIT 50');
}

export async function updateQueueStatus(
  id: number,
  status: 'synced' | 'conflict',
  conflictReason?: string | null
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE sync_queue SET status = ?, conflict_reason = ? WHERE id = ?',
    [status, conflictReason || null, id]
  );
}

export async function overwriteLocalFixtureScore(
  fixtureId: number,
  scoreA: number,
  scoreB: number
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE fixtures SET score_a = ?, score_b = ?, status = \'completed\' WHERE id = ?',
    [scoreA, scoreB, fixtureId]
  );
}
