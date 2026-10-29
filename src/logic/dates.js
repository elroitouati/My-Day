// עזרי תאריכים טהורים — הכל לפי השעון המקומי, מפתח יום בפורמט YYYY-MM-DD.

export const HEB_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
export const HEB_WEEKDAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
export const HEB_WEEKDAYS_LETTER = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
export const HEB_WEEKDAYS_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const pad = (n) => String(n).padStart(2, '0');

export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey() {
  return dayKey(new Date());
}

// מפתח יום → Date בחצות מקומי
export function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

// מספר ימים מ-a עד b (חיובי אם b אחרי a). עמיד לשעון קיץ בזכות עיגול.
export function diffDays(a, b) {
  return Math.round((keyToDate(b) - keyToDate(a)) / 86400000);
}

export function weekday(key) {
  return keyToDate(key).getDay();
}

export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

// יום ראשון של השבוע שבו נמצא היום
export function startOfWeek(key) {
  return addDays(key, -weekday(key));
}

export function rangeKeys(startKey, endKey) {
  const out = [];
  for (let k = startKey; k <= endKey; k = addDays(k, 1)) out.push(k);
  return out;
}

export function formatHebDate(key, { year = false } = {}) {
  const d = keyToDate(key);
  return `${d.getDate()} ב${HEB_MONTHS[d.getMonth()]}${year ? ` ${d.getFullYear()}` : ''}`;
}

export function formatDayTitle(key) {
  return `יום ${HEB_WEEKDAYS_FULL[weekday(key)]}`;
}

export function monthLabel(year, monthIndex) {
  return `${HEB_MONTHS[monthIndex]} ${year}`;
}

// "HH:MM" → דקות מתחילת היום
export function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(min) {
  const h = Math.floor(min / 60) % 24;
  return `${pad(h)}:${pad(min % 60)}`;
}

export function dateToTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Date מקומי של יום + שעה
export function keyTimeToDate(key, time) {
  const d = keyToDate(key);
  const min = timeToMinutes(time) || 0;
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  return d;
}

// "מ-X" נשמר כסיום ב-23:59 (עד סוף היום); "עד X" נשמר בלי שעת התחלה
export const END_OF_DAY = '23:59';

export function formatTimeRange(start, end) {
  if (!start) return end ? `עד ${end}` : 'כל היום';
  if (end === END_OF_DAY) return `מ-${start}`;
  return end ? `${start}–${end}` : start;
}

// מצב השעה של משימה: allday | range (שעה / טווח) | from (משעה X והלאה) | until (עד שעה X)
export function timeModeOf(start, end) {
  if (!start) return end ? 'until' : 'allday';
  return end === END_OF_DAY ? 'from' : 'range';
}

export function timesFor(mode, start, end) {
  if (mode === 'until') return { start_time: null, end_time: end || null };
  if (mode === 'from') return { start_time: start, end_time: END_OF_DAY };
  if (mode === 'range') return { start_time: start, end_time: end && end !== END_OF_DAY ? end : null };
  return { start_time: null, end_time: null };
}

// השעה שלפיה מזכירים / מצלצלים: ההתחלה, ואם אין — המועד האחרון ("עד")
export const anchorTime = (item) => item.startTime || item.endTime || null;

// לוח חודשי: מערך שבועות, כל אחד 7 תאים (null לתא ריק). השבוע מתחיל בראשון.
export function buildMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const total = daysInMonth(year, monthIndex);
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(dayKey(new Date(year, monthIndex, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
