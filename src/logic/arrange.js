// סידור רשימת היום לפי העדפות המשתמש — טהור ומכוסה בבדיקות.
//  sortMode:  'auto'   — "כל היום" ואז לפי שעה (ברירת מחדל)
//             'manual' — הסדר שנשמר בגרירה (פריטים חדשים נכנסים לפי הסדר האוטומטי, בסוף)
//  משימות חשובות שעוד לא בוצעו — תמיד בראש הרשימה
//  doneItems: 'inline' — במקום | 'bottom' — בסוף הרשימה | 'hide' — מוסתרים

export function arrangeItems(items, { sortMode = 'auto', order = null, doneItems = 'inline' } = {}) {
  let list = [...items];
  if (sortMode === 'manual' && order && order.length) {
    const pos = new Map(order.map((uid, i) => [uid, i]));
    const known = list.filter((i) => pos.has(i.uid)).sort((a, b) => pos.get(a.uid) - pos.get(b.uid));
    const rest = list.filter((i) => !pos.has(i.uid));
    list = [...known, ...rest];
  }
  // משימות חשובות תמיד למעלה (כל עוד לא בוצעו)
  list = [...list.filter((i) => i.important && !i.done), ...list.filter((i) => !(i.important && !i.done))];
  if (doneItems === 'bottom') list = [...list.filter((i) => !i.done), ...list.filter((i) => i.done)];
  if (doneItems === 'hide') list = list.filter((i) => !i.done);
  return list;
}

// האם רגע מסוים נופל בשעות השקט
//  quiet = { enabled, from: '22:00', to: '07:00', shabbat }
//  שבת: משישי 16:00 עד מוצאי שבת 20:00
export function inQuietHours(date, quiet) {
  if (!quiet) return false;
  const min = date.getHours() * 60 + date.getMinutes();
  const day = date.getDay();
  if (quiet.shabbat && ((day === 5 && min >= 16 * 60) || (day === 6 && min < 20 * 60))) return true;
  if (!quiet.enabled || !quiet.from || !quiet.to) return false;
  const [fh, fm] = quiet.from.split(':').map(Number);
  const [th, tm] = quiet.to.split(':').map(Number);
  const from = fh * 60 + fm;
  const to = th * 60 + tm;
  if (from === to) return false;
  return from < to ? min >= from && min < to : min >= from || min < to; // טווח שחוצה חצות
}
