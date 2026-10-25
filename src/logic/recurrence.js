// לוגיקת חזרה של משימות — טהורה, בלי תלות ב-React Native, ומכוסה בבדיקות.
//
// משימה חד-פעמית: { kind: 'once', date }
// משימה קבועה:    { kind: 'recurring', start_date, end_date|null, rule }
//   rule = { freq: 'daily' }
//        | { freq: 'weekly', days: [0..6] }        (0 = ראשון)
//        | { freq: 'interval', every: N }          (כל N ימים מתאריך ההתחלה)
//        | { freq: 'monthly', day: 1..31 }         (יום שלא קיים בחודש → היום האחרון)

import {
  addDays,
  diffDays,
  weekday,
  keyToDate,
  daysInMonth,
  HEB_WEEKDAYS_SHORT,
} from './dates';

export const FREQS = ['daily', 'weekly', 'interval', 'monthly'];

export function parseRule(rule) {
  if (!rule) return null;
  if (typeof rule === 'string') {
    try {
      return JSON.parse(rule);
    } catch {
      return null;
    }
  }
  return rule;
}

// האם כלל החזרה תקין (משמש לפני שמירה)
export function validateRule(rule) {
  const r = parseRule(rule);
  if (!r || !FREQS.includes(r.freq)) return false;
  if (r.freq === 'weekly') return Array.isArray(r.days) && r.days.length > 0 && r.days.every((d) => d >= 0 && d <= 6);
  if (r.freq === 'interval') return Number.isInteger(r.every) && r.every >= 1;
  if (r.freq === 'monthly') return Number.isInteger(r.day) && r.day >= 1 && r.day <= 31;
  return true;
}

// היום בחודש שבו משימה חודשית חלה בפועל (31 בפברואר → 28/29)
export function monthlyDayFor(day, year, monthIndex) {
  return Math.min(day, daysInMonth(year, monthIndex));
}

function ruleMatches(rule, startKey, key) {
  switch (rule.freq) {
    case 'daily':
      return true;
    case 'weekly':
      return rule.days.includes(weekday(key));
    case 'interval':
      return diffDays(startKey, key) % rule.every === 0;
    case 'monthly': {
      const d = keyToDate(key);
      return d.getDate() === monthlyDayFor(rule.day, d.getFullYear(), d.getMonth());
    }
    default:
      return false;
  }
}

// האם המשימה מופיעה ביום הנתון. skips = Set של ימים שבוטלו ("רק המופע הזה").
export function occursOn(task, key, skips) {
  if (skips && skips.has(key)) return false;
  if (task.kind === 'once') return task.date === key;
  const rule = parseRule(task.rule);
  if (!rule || !task.start_date) return false;
  if (key < task.start_date) return false;
  if (task.end_date && key > task.end_date) return false;
  return ruleMatches(rule, task.start_date, key);
}

// כל הימים בטווח (כולל) שבהם המשימה מופיעה
export function occurrencesInRange(task, startKey, endKey, skips) {
  const out = [];
  if (task.kind === 'once') {
    if (task.date >= startKey && task.date <= endKey && !(skips && skips.has(task.date))) out.push(task.date);
    return out;
  }
  const from = startKey > task.start_date ? startKey : task.start_date;
  const to = task.end_date && task.end_date < endKey ? task.end_date : endKey;
  for (let k = from; k <= to; k = addDays(k, 1)) {
    if (occursOn(task, k, skips)) out.push(k);
  }
  return out;
}

// תיאור קצר בעברית להצגה בכרטיס / בגיליון
export function describeRule(task) {
  if (task.kind === 'once') return 'חד-פעמית';
  const r = parseRule(task.rule);
  if (!r) return '';
  switch (r.freq) {
    case 'daily':
      return 'כל יום';
    case 'weekly':
      if (r.days.length === 7) return 'כל יום';
      return `בימים ${[...r.days].sort((a, b) => a - b).map((d) => HEB_WEEKDAYS_SHORT[d]).join(' ')}`;
    case 'interval':
      return r.every === 1 ? 'כל יום' : r.every === 2 ? 'כל יומיים' : `כל ${r.every} ימים`;
    case 'monthly':
      return `כל חודש ב-${r.day}`;
    default:
      return '';
  }
}
