// פתיחת מסד הנתונים המקומי (SQLite) והרצת מיגרציות.
// אותו קובץ משמש את האפליקציה, את הווידג'ט ואת משימות הרקע.
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'myday.db';

const MIGRATIONS = [
  // גרסה 1
  `
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    sort INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    category_id TEXT,
    notes TEXT,
    start_time TEXT,
    end_time TEXT,
    kind TEXT NOT NULL,
    date TEXT,
    rule TEXT,
    start_date TEXT,
    end_date TEXT,
    reminder INTEGER,
    created_at INTEGER,
    updated_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS skips (
    task_id TEXT NOT NULL,
    date TEXT NOT NULL,
    PRIMARY KEY (task_id, date)
  );
  CREATE TABLE IF NOT EXISTS completions (
    item_key TEXT NOT NULL,
    date TEXT NOT NULL,
    done_at INTEGER,
    PRIMARY KEY (item_key, date)
  );
  CREATE INDEX IF NOT EXISTS completions_date ON completions(date);
  CREATE TABLE IF NOT EXISTS cal_events (
    event_id TEXT NOT NULL,
    date TEXT NOT NULL,
    calendar_id TEXT,
    title TEXT,
    start_time TEXT,
    end_time TEXT,
    all_day INTEGER NOT NULL DEFAULT 0,
    color TEXT,
    PRIMARY KEY (event_id, date)
  );
  CREATE TABLE IF NOT EXISTS panmatz_items (
    date TEXT NOT NULL,
    goal_id TEXT NOT NULL,
    title TEXT,
    target TEXT,
    done INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT,
    PRIMARY KEY (date, goal_id)
  );
  CREATE TABLE IF NOT EXISTS sync_queue (
    date TEXT NOT NULL,
    goal_id TEXT NOT NULL,
    done INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (date, goal_id)
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );
  INSERT OR IGNORE INTO categories (id, name, color, sort) VALUES
    ('personal', 'אישי', '#3A86FF', 0),
    ('study', 'לימודים', '#8B5CF6', 1),
    ('home', 'בית', '#FF8A00', 2),
    ('health', 'בריאות', '#10C77F', 3);
  `,
  // גרסה 2 — סדר ידני של המשימות בכל יום (גרירה)
  `
  CREATE TABLE IF NOT EXISTS day_order (
    date TEXT PRIMARY KEY NOT NULL,
    uids TEXT NOT NULL
  );
  `,
];

let dbPromise = null;

async function open() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
    });
    version += 1;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
  return db;
}

export function getDb() {
  if (!dbPromise) {
    dbPromise = open().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}
