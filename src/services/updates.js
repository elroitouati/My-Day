// עדכונים "באוויר" (expo-updates): בדיקה, הורדה והפעלה, עם מצב משותף לכל המסכים.
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';
import * as Notifications from 'expo-notifications';
import { getSettings, setSetting } from '../db/repo';

// idle | checking | downloading | ready | uptodate | error | disabled
let state = { status: 'idle', checkedAt: null };
const listeners = new Set();

function set(next) {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn(state));
}

export const getUpdateState = () => state;
export function subscribeUpdates(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const updatesEnabled = () => !__DEV__ && Updates.isEnabled;

// בודק, ואם יש — מוריד. אחרי ההורדה status = 'ready' ואפשר להפעיל.
export async function checkForUpdate() {
  if (!updatesEnabled()) return set({ status: 'disabled' });
  if (['checking', 'downloading', 'ready'].includes(state.status)) return state;
  set({ status: 'checking' });
  try {
    const res = await Updates.checkForUpdateAsync();
    if (!res.isAvailable) return set({ status: 'uptodate', checkedAt: Date.now() });
    set({ status: 'downloading' });
    await Updates.fetchUpdateAsync();
    return set({ status: 'ready', checkedAt: Date.now() });
  } catch {
    return set({ status: 'error', checkedAt: Date.now() });
  }
}

// מפעיל מחדש עם העדכון. אם ההפעלה נכשלת — מסבירים מה לעשות במקום להיכשל בשקט.
export async function applyUpdate() {
  try {
    await Updates.reloadAsync();
  } catch (e) {
    Alert.alert('העדכון לא הופעל', `סגור את האפליקציה לגמרי ופתח שוב — העדכון ייכנס.\n\n(${e?.message || e})`);
  }
}

// מתי נבנתה הגרסה שרצה עכשיו (עדכון אחרון או ה-APK עצמו)
export function currentBuildDate() {
  return Updates.createdAt || null;
}

// מהרקע: אם יש עדכון — מוריד אותו (ייכנס בפתיחה הבאה) ושולח התראה פעם אחת לכל עדכון
export async function backgroundUpdateCheck() {
  if (!updatesEnabled()) return;
  try {
    const res = await Updates.checkForUpdateAsync();
    if (!res.isAvailable) return;
    const id = res.manifest?.id || 'new';
    const s = await getSettings();
    if (s.notifiedUpdateId === id) return;
    await Updates.fetchUpdateAsync().catch(() => {});
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'עדכון חדש ל-My Day ✨',
        body: 'פתח את האפליקציה כדי לקבל את השיפורים החדשים',
      },
      trigger: { channelId: 'updates', seconds: 1 },
    });
    await setSetting('notifiedUpdateId', id);
  } catch {
    // אין רשת וכו'
  }
}
