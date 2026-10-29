// צלצולים למשימות חשובות (מודול נייטיב מקומי: modules/myday-alarm).
// בגרסת APK ישנה בלי המודול — כל הפונקציות פשוט לא עושות כלום.
import { requireOptionalNativeModule } from 'expo-modules-core';

const Native = requireOptionalNativeModule('MyDayAlarm');

export const alarmsAvailable = () => !!Native;

// אפשרויות "מתי לצלצל" (דקות לפני ההתחלה)
export const ALARM_OPTIONS = [
  { value: 0, label: 'בזמן' },
  { value: 5, label: '5 דק׳ לפני' },
  { value: 10, label: '10 דק׳' },
  { value: 15, label: '15 דק׳' },
  { value: 30, label: '30 דק׳' },
  { value: 60, label: 'שעה' },
];
export const DEFAULT_ALARMS = [15, 0];

export function parseAlarms(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'number') : [];
  } catch {
    return [];
  }
}

export function scheduleAlarm(a) {
  Native?.schedule(a);
}
export function cancelAllAlarms() {
  Native?.cancelAll();
}
export function testAlarm(color) {
  Native?.test({ id: 'test', at: Date.now(), title: 'משימה חשובה לדוגמה', body: 'ככה זה יצלצל', taskId: '', date: '', color: color || '#6C5CFF' });
}
export const canUseFullScreen = () => (Native ? Native.canUseFullScreen() : true);
export const openFullScreenSettings = () => Native?.openFullScreenSettings();
export const canScheduleExact = () => (Native ? Native.canScheduleExact() : true);
export const openExactSettings = () => Native?.openExactSettings();
export const getAlarmSound = () => (Native ? Native.getSound() : null);
export const resetAlarmSound = () => (Native ? Native.resetSound() : null);
export const pickAlarmSound = () => (Native ? Native.pickSound() : Promise.resolve(null));
