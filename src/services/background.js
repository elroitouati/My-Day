// משימת רקע תקופתית (בערך כל 15 דקות, לפי מה שאנדרואיד מאפשר):
// מושכת שינויים מפנמ"צ, מרעננת את היומן, מתזמנת התראות, מעדכנת את הווידג'ט ובודקת עדכונים.
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { fullRefresh } from './refresh';
import { backgroundUpdateCheck } from './updates';

export const BACKGROUND_TASK = 'my-day-background-refresh';

TaskManager.defineTask(BACKGROUND_TASK, async () => {
  try {
    await Promise.allSettled([fullRefresh(), backgroundUpdateCheck()]);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundTask() {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (status !== BackgroundFetch.BackgroundFetchStatus.Available) return false;
    if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK)) return true;
    await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
    return true;
  } catch (e) {
    console.warn('רישום משימת רקע נכשל', e);
    return false;
  }
}
