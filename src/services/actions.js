// פעולות שמשנות נתונים + מה שקורה אחריהן: רענון מסכים, ווידג'ט והתראות.
import { setCompletion, itemKeyForTask, itemKeyForEvent } from '../db/repo';
import { markPanmatz } from './panmatzSync';
import { emitDataChanged } from './events';
import { refreshWidget } from '../widget/update';
import { rescheduleNotifications } from './notifications';

export async function afterChange({ widget = true } = {}) {
  emitDataChanged();
  await Promise.allSettled([widget ? refreshWidget() : null, rescheduleNotifications()]);
}

// ref = { source: 'task' | 'calendar' | 'panmatz', id, date }
export async function setItemDone(ref, done, opts) {
  if (ref.source === 'task') await setCompletion(itemKeyForTask(ref.id), ref.date, done);
  else if (ref.source === 'calendar') await setCompletion(itemKeyForEvent(ref.id), ref.date, done);
  else if (ref.source === 'panmatz') await markPanmatz(ref.date, ref.id, done);
  await afterChange(opts);
}
