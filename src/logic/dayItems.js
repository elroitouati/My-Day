// בניית רשימת "פריטים" ליום — מאחדת את שלושת המקורות:
// משימות My Day, אירועי יומן (Google Calendar דרך הטלפון) ויעדי פנמ"צ.
// טהורה — משמשת גם את האפליקציה וגם את הווידג'ט.

import { occurrencesInRange } from './recurrence';
import { timeToMinutes } from './dates';

export const PANMATZ_CATEGORY = { id: 'panmatz', name: 'פנמ"צ', color: '#E0A100' };
export const CALENDAR_CATEGORY = { id: 'calendar', name: 'יומן', color: '#4C8DFF' };
export const UNCATEGORIZED = { id: null, name: '', color: '#9AA0B4' }; // משימה בלי קטגוריה: אפור, בלי שם

export const itemKeyForTask = (id) => `task:${id}`;
export const itemKeyForEvent = (eventId) => `cal:${eventId}`;

// data = { tasks, skips: Map<taskId, Set<date>>, completions: Set<'itemKey|date'>,
//          categories: Map<id, cat>, calEvents: [{key,event_id,date,title,start_time,end_time,all_day,color}],
//          panmatz: [{date,goal_id,title,target,done,deleted}] }
export function buildRangeItems(startKey, endKey, data, today) {
  const byDate = {};
  const push = (date, item) => {
    (byDate[date] = byDate[date] || []).push(item);
  };
  const done = (key, date) => data.completions.has(`${key}|${date}`);

  for (const task of data.tasks) {
    const skips = data.skips.get(task.id);
    const cat = (task.category_id && data.categories.get(task.category_id)) || UNCATEGORIZED;
    for (const date of occurrencesInRange(task, startKey, endKey, skips)) {
      const key = itemKeyForTask(task.id);
      push(date, {
        uid: `${key}|${date}`,
        source: 'task',
        id: task.id,
        date,
        title: task.title,
        notes: task.notes || '',
        color: task.color || cat.color || UNCATEGORIZED.color, // צבע משלה גובר על צבע הקטגוריה
        categoryName: cat.name,
        startTime: task.start_time || null,
        endTime: task.end_time || null,
        recurring: task.kind === 'recurring',
        important: !!task.important,
        done: done(key, date),
        task,
      });
    }
  }

  for (const ev of data.calEvents || []) {
    if (ev.date < startKey || ev.date > endKey) continue;
    const key = itemKeyForEvent(ev.event_id);
    push(ev.date, {
      uid: `${key}|${ev.date}`,
      source: 'calendar',
      id: ev.event_id,
      date: ev.date,
      title: ev.title || '(ללא כותרת)',
      notes: '',
      color: ev.color || CALENDAR_CATEGORY.color,
      categoryName: CALENDAR_CATEGORY.name,
      startTime: ev.all_day ? null : ev.start_time,
      endTime: ev.all_day ? null : ev.end_time,
      recurring: false,
      done: done(key, ev.date),
    });
  }

  for (const p of data.panmatz || []) {
    if (p.deleted || p.date < startKey || p.date > endKey) continue;
    push(p.date, {
      uid: `panmatz:${p.goal_id}|${p.date}`,
      source: 'panmatz',
      id: p.goal_id,
      date: p.date,
      title: p.title || 'אימון',
      notes: p.target || '',
      subtitle: p.target || '',
      color: PANMATZ_CATEGORY.color,
      categoryName: PANMATZ_CATEGORY.name,
      startTime: null,
      endTime: null,
      recurring: false,
      done: !!p.done,
    });
  }

  for (const date of Object.keys(byDate)) {
    byDate[date] = sortItems(byDate[date]).map((it) => ({
      ...it,
      // "פספוס" (אדום) רק לאימוני פנמ"צ. משימה רגילה שלא סומנה — רק "לא סומן", בלי שיפוט
      missed: !!today && date < today && !it.done && it.source === 'panmatz',
      unmarked: !!today && date < today && !it.done && it.source !== 'panmatz',
    }));
  }
  return byDate;
}

// "כל היום" קודם, אחר כך לפי שעת התחלה, ואז לפי כותרת
export function sortItems(items) {
  return [...items].sort((a, b) => {
    const ta = timeToMinutes(a.startTime);
    const tb = timeToMinutes(b.startTime);
    if (ta == null && tb != null) return -1;
    if (ta != null && tb == null) return 1;
    if (ta != null && tb != null && ta !== tb) return ta - tb;
    const order = { task: 0, panmatz: 1, calendar: 2 };
    if (order[a.source] !== order[b.source]) return order[a.source] - order[b.source];
    return a.title.localeCompare(b.title, 'he');
  });
}

export function progress(items) {
  const total = items.length;
  const doneCount = items.filter((i) => i.done).length;
  return { total, done: doneCount, ratio: total ? doneCount / total : 0 };
}
