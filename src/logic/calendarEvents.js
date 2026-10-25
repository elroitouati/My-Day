// המרת אירועי יומן לרשומות יומיות (אירוע של כמה ימים מופיע בכל אחד מהם).
import { addDays, dayKey, dateToTime } from './dates';

const pad = (n) => String(n).padStart(2, '0');
// אירועי "כל היום" נשמרים באנדרואיד בחצות UTC
const utcKey = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export function splitEvent(ev, rangeStart, rangeEnd, color) {
  const start = new Date(ev.startDate);
  const end = new Date(ev.endDate || ev.startDate);
  if (isNaN(start)) return [];
  const rows = [];
  const base = {
    event_id: String(ev.id),
    calendar_id: ev.calendarId ? String(ev.calendarId) : null,
    title: ev.title || '',
    color: color || null,
  };

  if (ev.allDay) {
    const first = utcKey(start);
    let last = addDays(utcKey(end), -1); // סוף בלעדי
    if (last < first) last = first;
    for (let k = first; k <= last; k = addDays(k, 1)) {
      if (k >= rangeStart && k <= rangeEnd) rows.push({ ...base, date: k, all_day: 1, start_time: null, end_time: null });
    }
    return rows;
  }

  const first = dayKey(start);
  const lastMoment = end > start ? new Date(end.getTime() - 1) : start;
  const last = dayKey(lastMoment);
  for (let k = first; k <= last; k = addDays(k, 1)) {
    if (k < rangeStart || k > rangeEnd) continue;
    const isFirst = k === first;
    const isLast = k === last;
    if (!isFirst && !isLast) {
      rows.push({ ...base, date: k, all_day: 1, start_time: null, end_time: null });
    } else {
      rows.push({
        ...base,
        date: k,
        all_day: 0,
        start_time: isFirst ? dateToTime(start) : '00:00',
        end_time: isLast ? (end > start ? dateToTime(end) : null) : '23:59',
      });
    }
  }
  return rows;
}
