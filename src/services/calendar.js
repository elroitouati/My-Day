// Google Calendar — קריאה בלבד מהיומנים שכבר מסונכרנים לטלפון (בלי OAuth).
import * as Calendar from 'expo-calendar';
import { getSettings, setSetting, replaceCalendarCache, clearCalendarCache } from '../db/repo';
import { splitEvent } from '../logic/calendarEvents';
import { addDays, keyToDate, todayKey } from '../logic/dates';

const BACK = 35;
const FORWARD = 62;

export async function hasCalendarPermission() {
  try {
    const p = await Calendar.getCalendarPermissionsAsync();
    return p.granted;
  } catch {
    return false;
  }
}

export async function requestCalendarPermission() {
  const p = await Calendar.requestCalendarPermissionsAsync();
  return p.granted;
}

export async function listCalendars() {
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return cals
    .map((c) => ({
      id: String(c.id),
      title: c.title || c.name || 'יומן',
      color: c.color || '#4C8DFF',
      account: c.source?.name || c.ownerAccount || '',
    }))
    .sort((a, b) => a.account.localeCompare(b.account) || a.title.localeCompare(b.title));
}

// מושך אירועים מהיומנים שנבחרו ושומר במטמון המקומי (שממנו קוראים גם הווידג'ט)
export async function refreshCalendarCache() {
  const settings = await getSettings();
  if (!settings.calendarEnabled) return;
  if (!(await hasCalendarPermission())) return;
  const cals = await listCalendars();
  let ids = settings.calendarIds;
  if (!ids) {
    ids = cals.map((c) => c.id);
    await setSetting('calendarIds', ids);
  }
  const known = new Map(cals.map((c) => [c.id, c]));
  ids = ids.filter((id) => known.has(id));
  const today = todayKey();
  const startKey = addDays(today, -BACK);
  const endKey = addDays(today, FORWARD);
  if (!ids.length) {
    await replaceCalendarCache(startKey, endKey, []);
    return;
  }
  const events = await Calendar.getEventsAsync(ids, keyToDate(startKey), keyToDate(addDays(endKey, 1)));
  const rows = [];
  for (const ev of events) {
    if (ev.status === Calendar.EventStatus?.CANCELED) continue;
    const color = known.get(String(ev.calendarId))?.color;
    rows.push(...splitEvent(ev, startKey, endKey, color));
  }
  await replaceCalendarCache(startKey, endKey, rows);
}

export async function disableCalendar() {
  await setSetting('calendarEnabled', false);
  await clearCalendarCache();
}
