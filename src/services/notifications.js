// התראות מקומיות: לפני משימה עם שעה, תזכורת בוקר וערב, וצלצול למשימות חשובות.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getSettings, loadRange } from '../db/repo';
import { addDays, keyTimeToDate, rangeKeys, todayKey, formatTimeRange, anchorTime } from '../logic/dates';
import { coalesce } from './events';
import { inQuietHours } from '../logic/arrange';
import { colors } from '../design/tokens';
import { alarmsAvailable, scheduleAlarm, cancelAllAlarms, parseAlarms } from './alarms';

export const TASK_CATEGORY = 'task-reminder';
export const DONE_ACTION = 'done';
const DAYS_AHEAD = 7;
const MAX_TASK_NOTIFICATIONS = 50; // אנדרואיד מגביל את מספר ההתראות המתוזמנות
const MAX_ALARMS = 40;

export const REMINDER_OPTIONS = [
  { value: null, label: 'בלי' },
  { value: 0, label: 'בהתחלה' },
  { value: 5, label: '5 דק׳' },
  { value: 10, label: '10 דק׳' },
  { value: 15, label: '15 דק׳' },
  { value: 30, label: '30 דק׳' },
  { value: 60, label: 'שעה' },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let setupDone = null;
export function setupNotifications() {
  if (!setupDone) {
    setupDone = (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('tasks', {
          name: 'תזכורות למשימות',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 180, 120, 180],
          lightColor: colors.brand,
        });
        await Notifications.setNotificationChannelAsync('updates', {
          name: 'עדכונים לאפליקציה',
          importance: Notifications.AndroidImportance.DEFAULT,
          lightColor: colors.brand,
        });
        await Notifications.setNotificationChannelAsync('evening', {
          name: 'תזכורות בוקר וערב',
          importance: Notifications.AndroidImportance.DEFAULT,
          lightColor: colors.brand,
        });
      }
      // כפתור "בוצע" בתוך ההתראה
      await Notifications.setNotificationCategoryAsync(TASK_CATEGORY, [
        {
          identifier: DONE_ACTION,
          buttonTitle: 'בוצע ✓',
          options: { opensAppToForeground: true },
        },
      ]);
    })().catch((e) => {
      setupDone = null;
      throw e;
    });
  }
  return setupDone;
}

export async function notificationPermission() {
  const p = await Notifications.getPermissionsAsync();
  return { granted: p.granted, canAskAgain: p.canAskAgain };
}

export async function requestNotificationPermission() {
  await setupNotifications();
  const p = await Notifications.requestPermissionsAsync();
  return p.granted;
}

function reminderBody(item, minutes) {
  const range = formatTimeRange(item.startTime, item.endTime);
  if (!item.startTime) return minutes === 0 ? `הגיע הזמן · ${range}` : `נשארו ${minutes === 60 ? 'שעה' : `${minutes} דקות`} · ${range}`;
  if (minutes === 0) return `מתחיל עכשיו · ${range}`;
  if (minutes === 60) return `בעוד שעה · ${range}`;
  return `בעוד ${minutes} דקות · ${range}`;
}

function morningBody(count) {
  return count === 1 ? 'יש לך משימה אחת היום' : `יש לך ${count} משימות היום`;
}

function eveningBody(open) {
  return open === 1 ? 'נשארה לך משימה אחת להיום' : `נשארו לך ${open} משימות להיום`;
}

// רגעי הצלצול של משימות חשובות (טהור — מכוסה בבדיקות). בשבת לא מצלצל אם "שבת" מסומן בשעות השקט.
export function importantAlarmTimes(byDate, dates, now, { shabbat = false } = {}) {
  const out = [];
  for (const date of dates) {
    for (const item of byDate[date] || []) {
      if (item.source !== 'task' || !item.important || !anchorTime(item) || item.done) continue;
      const start = keyTimeToDate(date, anchorTime(item)).getTime();
      for (const minutes of parseAlarms(item.task?.alarms)) {
        const at = start - minutes * 60000;
        if (at <= now || inQuietHours(new Date(at), { shabbat })) continue;
        out.push({ item, date, minutes, at });
      }
    }
  }
  return out.sort((a, b) => a.at - b.at).slice(0, MAX_ALARMS);
}

function alarmBody(item, minutes) {
  const range = formatTimeRange(item.startTime, item.endTime);
  if (!item.startTime) return minutes === 0 ? `הגיע הזמן · ${range}` : `נשארו ${minutes === 60 ? 'שעה' : `${minutes} דקות`} · ${range}`;
  return minutes === 0 ? `עכשיו · ${range}` : `בעוד ${minutes === 60 ? 'שעה' : `${minutes} דקות`} · ${range}`;
}

function scheduleImportantAlarms(byDate, today, end, now, settings) {
  if (!alarmsAvailable()) return;
  for (const { item, date, minutes, at } of importantAlarmTimes(byDate, rangeKeys(today, end), now, { shabbat: !!settings.quietShabbat })) {
    scheduleAlarm({
      id: `alarm:${item.id}:${date}:${minutes}`,
      at,
      title: item.title,
      body: alarmBody(item, minutes),
      taskId: item.id,
      date,
      color: item.color,
    });
  }
}

// מחשב מחדש את כל ההתראות המתוזמנות לשבוע הקרוב. נקרא אחרי כל שינוי.
async function rescheduleNow() {
  await setupNotifications();
  await Notifications.cancelAllScheduledNotificationsAsync();
  cancelAllAlarms();
  const settings = await getSettings();
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;

  const today = todayKey();
  const end = addDays(today, DAYS_AHEAD - 1);
  const byDate = await loadRange(today, end);
  const now = Date.now() + 5000;
  // צלצולים למשימות חשובות — גם כשהתזכורות הרגילות כבויות
  scheduleImportantAlarms(byDate, today, end, now, settings);
  if (!settings.notificationsEnabled) return;
  let taskCount = 0;
  const quiet = {
    enabled: settings.quietEnabled,
    from: settings.quietFrom,
    to: settings.quietTo,
    shabbat: settings.quietShabbat,
  };
  const allowed = (ms) => ms > now && !inQuietHours(new Date(ms), quiet); // בלי התראות בשעות השקט

  for (const date of rangeKeys(today, end)) {
    const items = byDate[date] || [];
    for (const item of items) {
      if (taskCount >= MAX_TASK_NOTIFICATIONS) break;
      if (item.source !== 'task' || !anchorTime(item) || item.done) continue;
      const minutes = item.task.reminder;
      if (minutes == null) continue;
      const at = keyTimeToDate(date, anchorTime(item)).getTime() - minutes * 60000;
      if (!allowed(at)) continue;
      taskCount += 1;
      await Notifications.scheduleNotificationAsync({
        identifier: `task:${item.id}:${date}`,
        content: {
          title: item.title,
          body: reminderBody(item, minutes),
          categoryIdentifier: TASK_CATEGORY,
          color: item.color,
          data: { source: 'task', id: item.id, date },
        },
        trigger: { date: new Date(at), channelId: 'tasks' },
      });
    }

    if (settings.morningEnabled) {
      const at = keyTimeToDate(date, settings.morningTime || '07:30').getTime();
      const open = items.filter((i) => !i.done).length;
      if (allowed(at) && open > 0) {
        await Notifications.scheduleNotificationAsync({
          identifier: `morning:${date}`,
          content: {
            title: 'בוקר טוב ☀️',
            body: morningBody(open),
            data: { type: 'morning', date },
          },
          trigger: { date: new Date(at), channelId: 'evening' },
        });
      }
    }

    if (settings.eveningEnabled) {
      const at = keyTimeToDate(date, settings.eveningTime || '21:00').getTime();
      const open = items.filter((i) => !i.done).length;
      if (allowed(at) && open > 0) {
        await Notifications.scheduleNotificationAsync({
          identifier: `evening:${date}`,
          content: {
            title: 'My Day',
            body: eveningBody(open),
            data: { type: 'evening', date },
          },
          trigger: { date: new Date(at), channelId: 'evening' },
        });
      }
    }
  }
}

export const rescheduleNotifications = coalesce(() => rescheduleNow().catch((e) => console.warn('תזמון התראות נכשל', e)));
