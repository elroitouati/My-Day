// טיפול בלחיצה על "בוצע" בתוך התראה.
import * as Notifications from 'expo-notifications';
import { DONE_ACTION } from './notifications';
import { setItemDone } from './actions';
import { getSettings, setSetting } from '../db/repo';

async function handle(response) {
  if (!response || response.actionIdentifier !== DONE_ACTION) return;
  const req = response.notification.request;
  const data = req.content.data || {};
  if (!data.source || !data.id || !data.date) return;
  // אותה תגובה יכולה להגיע פעמיים (מאזין + getLast) — מטפלים פעם אחת בלבד
  const key = `${req.identifier}|${response.notification.date}`;
  const settings = await getSettings();
  if (settings.lastHandledResponse === key) return;
  await setSetting('lastHandledResponse', key);
  await setItemDone({ source: data.source, id: data.id, date: data.date }, true);
  Notifications.dismissNotificationAsync(req.identifier).catch(() => {});
}

let installed = false;
export function installNotificationResponseHandler() {
  if (installed) return;
  installed = true;
  Notifications.addNotificationResponseReceivedListener((r) => {
    handle(r).catch((e) => console.warn('טיפול בהתראה נכשל', e));
  });
  Notifications.getLastNotificationResponseAsync()
    .then(handle)
    .catch(() => {});
}
