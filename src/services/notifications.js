// התראות מקומיות: לפני משימה עם שעה, ותזכורת ערב על משימות פתוחות.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getSettings, loadRange } from '../db/repo';
import { addDays, keyTimeToDate, rangeKeys, todayKey, formatTimeRange } from '../logic/dates';
import { coalesce } from './events';
import { inQuietHours } from '../logic/arrange';
import { colors } from '../design/tokens';

export const TASK_CATEGORY = 'task-reminder';
export const DONE_ACTION = 'done';
const DAYS_AHEAD = 7;
const MAX_TASK_NOTIFICATIONS = 50; // אנדרואיד מגביל את מספר ההתראות המתוזמנות

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

// מחשב מחדש את כל ההתראות המתוזמנות לשבוע הקרוב. נקרא אחרי כל שינוי.
async function rescheduleNow() {
  await setupNotifications();
  await Notifications.cancelAllScheduledNotificationsAsync();
  const settings = await getSettings();
  if (!settings.notificationsEnabled) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;

  const today = todayKey();
  const end = addDays(today, DAYS_AHEAD - 1);
  const byDate = await loadRange(today, end);
  const now = Date.now() + 5000;
  let taskCount = 0;
  const quiet = { enabled: settings.quietEnabled, from: settings.quietFrom, to: settings.quietTo, shabbat: settings.quietShabbat };
  const allowed = (ms) => ms > now && !inQuietHours(new Date(ms), quiet); // בלי התראות בשעות השקט

  for (const date of rangeKeys(today, end)) {
    const items = byDate[date] || [];
    for (const item of items) {
      if (taskCount >= MAX_TASK_NOTIFICATIONS) break;
      if (item.source !== 'task' || !item.startTime || item.done) continue;
      const minutes = item.task.reminder;
      if (minutes == null) continue;
      const at = keyTimeToDate(date, item.startTime).getTime() - minutes * 60000;
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
          content: { title: 'בוקר טוב ☀️', body: morningBody(open), data: { type: 'morning', date } },
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
          content: { title: 'My Day', body: eveningBody(open), data: { type: 'evening', date } },
          trigger: { date: new Date(at), channelId: 'evening' },
        });
      }
    }
  }
}

export const rescheduleNotifications = coalesce(() => rescheduleNow().catch((e) => console.warn('תזמון התראות נכשל', e)));
