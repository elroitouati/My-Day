// כל הגישה למסד הנתונים עוברת כאן.
import { getDb } from './database';
import { buildRangeItems, itemKeyForTask, itemKeyForEvent } from '../logic/dayItems';
import { planDelete, planEdit } from '../logic/editing';
import { todayKey } from '../logic/dates';

// ---------------------------------------------------------------------------
//  הגדרות (key/value ב-JSON)
// ---------------------------------------------------------------------------
export const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  eveningEnabled: true,
  eveningTime: '21:00',
  morningEnabled: true,
  morningTime: '07:30',
  quietEnabled: false,
  quietFrom: '22:00',
  quietTo: '07:00',
  quietShabbat: false,
  defaultReminder: 10,
  calendarIds: null, // null = עוד לא נבחרו יומנים (בפעם הראשונה בוחרים את כולם)
  calendarEnabled: false,
};

export async function getSettings() {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT key, value FROM settings');
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    try {
      out[r.key] = JSON.parse(r.value);
    } catch {
      // ערך פגום — נשארים עם ברירת המחדל
    }
  }
  return out;
}

export async function setSetting(key, value) {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, JSON.stringify(value));
}

// ---------------------------------------------------------------------------
//  קטגוריות
// ---------------------------------------------------------------------------
export async function getCategories() {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM categories ORDER BY sort, name');
}

export async function saveCategory(cat) {
  const db = await getDb();
  if (cat.id) {
    await db.runAsync('UPDATE categories SET name = ?, color = ? WHERE id = ?', cat.name, cat.color, cat.id);
    return cat.id;
  }
  const id = `c_${Date.now().toString(36)}`;
  const max = await db.getFirstAsync('SELECT COALESCE(MAX(sort), 0) AS m FROM categories');
  await db.runAsync('INSERT INTO categories (id, name, color, sort) VALUES (?, ?, ?, ?)', id, cat.name, cat.color, (max?.m ?? 0) + 1);
  return id;
}

export async function deleteCategory(id) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE tasks SET category_id = NULL WHERE category_id = ?', id);
    await db.runAsync('DELETE FROM categories WHERE id = ?', id);
  });
}

// ---------------------------------------------------------------------------
//  משימות
// ---------------------------------------------------------------------------
const COLS = ['id', 'title', 'category_id', 'color', 'notes', 'start_time', 'end_time', 'kind', 'date', 'rule', 'start_date', 'end_date', 'reminder'];

async function insertTask(db, task) {
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO tasks (${COLS.join(', ')}, created_at, updated_at) VALUES (${COLS.map(() => '?').join(', ')}, ?, ?)`,
    ...COLS.map((c) => task[c] ?? null),
    now,
    now
  );
}

async function updateTask(db, id, patch) {
  const keys = Object.keys(patch).filter((k) => COLS.includes(k) && k !== 'id');
  if (!keys.length) return;
  await db.runAsync(
    `UPDATE tasks SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`,
    ...keys.map((k) => patch[k] ?? null),
    Date.now(),
    id
  );
}

async function deleteTaskRow(db, id) {
  await db.runAsync('DELETE FROM tasks WHERE id = ?', id);
  await db.runAsync('DELETE FROM skips WHERE task_id = ?', id);
  await db.runAsync('DELETE FROM completions WHERE item_key = ?', itemKeyForTask(id));
}

export async function getTask(id) {
  const db = await getDb();
  return db.getFirstAsync('SELECT * FROM tasks WHERE id = ?', id);
}

export async function createTask(task) {
  const db = await getDb();
  await insertTask(db, task);
  await rememberTask(task);
}

// ---------------------------------------------------------------------------
//  היסטוריית משימות — להשלמה אוטומטית בזמן הקלדה
// ---------------------------------------------------------------------------
export async function rememberTask(t) {
  if (!t?.title?.trim()) return;
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO task_history (title, category_id, color, start_time, end_time, reminder, uses, last_used)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)
     ON CONFLICT(title) DO UPDATE SET
       category_id = excluded.category_id, color = excluded.color, start_time = excluded.start_time,
       end_time = excluded.end_time, reminder = excluded.reminder, uses = uses + 1, last_used = excluded.last_used`,
    t.title.trim(), t.category_id ?? null, t.color ?? null, t.start_time ?? null, t.end_time ?? null, t.reminder ?? null, Date.now()
  );
}

export async function getTaskHistory() {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM task_history ORDER BY last_used DESC LIMIT 400');
}

export async function forgetTask(title) {
  const db = await getDb();
  await db.runAsync('DELETE FROM task_history WHERE title = ?', title);
}

async function runPlan(db, plan) {
  for (const step of plan) {
    if (step.op === 'delete') await deleteTaskRow(db, step.id);
    else if (step.op === 'skip') await db.runAsync('INSERT OR IGNORE INTO skips (task_id, date) VALUES (?, ?)', step.id, step.date);
    else if (step.op === 'update') await updateTask(db, step.id, step.patch);
    else if (step.op === 'insert') {
      await insertTask(db, step.task);
      if (step.carryCompletion) {
        const { fromId, fromDate } = step.carryCompletion;
        await db.runAsync(
          `INSERT OR IGNORE INTO completions (item_key, date, done_at)
           SELECT ?, date, done_at FROM completions WHERE item_key = ? AND date = ?`,
          itemKeyForTask(step.task.id), itemKeyForTask(fromId), fromDate
        );
      }
      if (step.carryFutureCompletions) {
        const { fromId, fromDate } = step.carryFutureCompletions;
        await db.runAsync(
          'UPDATE OR IGNORE completions SET item_key = ? WHERE item_key = ? AND date >= ?',
          itemKeyForTask(step.task.id), itemKeyForTask(fromId), fromDate
        );
      }
    }
  }
}

// scope: 'one' | 'future' | 'all'
export async function editTask(task, occurrenceKey, scope, draft) {
  const db = await getDb();
  await db.withTransactionAsync(() => runPlan(db, planEdit(task, occurrenceKey, scope, draft)));
  await rememberTask(draft);
}

export async function removeTask(task, occurrenceKey, scope) {
  const db = await getDb();
  await db.withTransactionAsync(() => runPlan(db, planDelete(task, occurrenceKey, scope)));
}

// ---------------------------------------------------------------------------
//  השלמות — לכל מופע ותאריך בנפרד
// ---------------------------------------------------------------------------
export async function setCompletion(itemKey, date, done) {
  const db = await getDb();
  if (done) {
    await db.runAsync('INSERT OR REPLACE INTO completions (item_key, date, done_at) VALUES (?, ?, ?)', itemKey, date, Date.now());
  } else {
    await db.runAsync('DELETE FROM completions WHERE item_key = ? AND date = ?', itemKey, date);
  }
}

// ---------------------------------------------------------------------------
//  מטמון אירועי יומן (כדי שהווידג'ט יוכל לקרוא בלי לפנות ליומן)
// ---------------------------------------------------------------------------
export async function replaceCalendarCache(startKey, endKey, rows) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM cal_events WHERE date >= ? AND date <= ?', startKey, endKey);
    for (const r of rows) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cal_events (event_id, date, calendar_id, title, start_time, end_time, all_day, color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        r.event_id, r.date, r.calendar_id, r.title, r.start_time, r.end_time, r.all_day ? 1 : 0, r.color
      );
    }
  });
}

export async function clearCalendarCache() {
  const db = await getDb();
  await db.runAsync('DELETE FROM cal_events');
}

// ---------------------------------------------------------------------------
//  פנמ"צ — עותק מקומי של הטבלה המשותפת + תור שינויים לאופליין
// ---------------------------------------------------------------------------
export async function getPanmatzRow(date, goalId) {
  const db = await getDb();
  return db.getFirstAsync('SELECT * FROM panmatz_items WHERE date = ? AND goal_id = ?', date, goalId);
}

export async function upsertPanmatzRow(r) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO panmatz_items (date, goal_id, title, target, done, deleted, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    r.date, r.goal_id, r.title ?? '', r.target ?? '', r.done ? 1 : 0, r.deleted ? 1 : 0, r.updated_at
  );
}

export async function clearPanmatz() {
  const db = await getDb();
  await db.execAsync('DELETE FROM panmatz_items; DELETE FROM sync_queue;');
}

export async function getQueue() {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM sync_queue ORDER BY updated_at');
}

// מפתח ראשי (date, goal_id) — שינוי חדש מחליף את הקודם, בלי כפילויות
export async function enqueueChange(change) {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO sync_queue (date, goal_id, done, updated_at) VALUES (?, ?, ?, ?)',
    change.date, change.goal_id, change.done ? 1 : 0, change.updated_at
  );
}

export async function dequeue(change) {
  const db = await getDb();
  await db.runAsync(
    'DELETE FROM sync_queue WHERE date = ? AND goal_id = ? AND updated_at = ?',
    change.date, change.goal_id, change.updated_at
  );
}

// ---------------------------------------------------------------------------
//  סדר ידני ליום (נשמר בגרירה)
// ---------------------------------------------------------------------------
export async function getDayOrder(date) {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT uids FROM day_order WHERE date = ?', date);
  try {
    return row ? JSON.parse(row.uids) : null;
  } catch {
    return null;
  }
}

export async function setDayOrder(date, uids) {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO day_order (date, uids) VALUES (?, ?)', date, JSON.stringify(uids));
}

// העברת משימה (או מופע אחד של משימה קבועה) ליום אחר
export async function moveTaskOccurrence(task, fromDate, toDate) {
  const draft = { ...task, kind: 'once', date: toDate, rule: null, start_date: null, end_date: null };
  await editTask(task, fromDate, task.kind === 'recurring' ? 'one' : 'all', draft);
}

// ---------------------------------------------------------------------------
//  טעינת טווח ימים → פריטים מוכנים לתצוגה (משמש את כל המסכים ואת הווידג'ט)
// ---------------------------------------------------------------------------
export async function loadRange(startKey, endKey) {
  const db = await getDb();
  const [tasks, skipRows, compRows, cats, calEvents, panmatz, settings] = await Promise.all([
    db.getAllAsync(
      `SELECT * FROM tasks WHERE (kind = 'once' AND date >= ? AND date <= ?)
         OR (kind = 'recurring' AND start_date <= ? AND (end_date IS NULL OR end_date >= ?))`,
      startKey, endKey, endKey, startKey
    ),
    db.getAllAsync('SELECT * FROM skips WHERE date >= ? AND date <= ?', startKey, endKey),
    db.getAllAsync('SELECT item_key, date FROM completions WHERE date >= ? AND date <= ?', startKey, endKey),
    db.getAllAsync('SELECT * FROM categories'),
    db.getAllAsync('SELECT * FROM cal_events WHERE date >= ? AND date <= ?', startKey, endKey),
    db.getAllAsync('SELECT * FROM panmatz_items WHERE date >= ? AND date <= ?', startKey, endKey),
    getSettings(),
  ]);
  const skips = new Map();
  for (const s of skipRows) {
    if (!skips.has(s.task_id)) skips.set(s.task_id, new Set());
    skips.get(s.task_id).add(s.date);
  }
  return buildRangeItems(
    startKey,
    endKey,
    {
      tasks,
      skips,
      completions: new Set(compRows.map((c) => `${c.item_key}|${c.date}`)),
      categories: new Map(cats.map((c) => [c.id, c])),
      calEvents: settings.calendarEnabled ? calEvents : [],
      panmatz,
    },
    todayKey()
  );
}

export async function loadDay(key) {
  const byDate = await loadRange(key, key);
  return byDate[key] || [];
}

export { itemKeyForTask, itemKeyForEvent };
