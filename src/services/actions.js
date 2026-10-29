// פעולות שמשנות נתונים + מה שקורה אחריהן: רענון מסכים, ווידג'ט והתראות.
import { setCompletion, itemKeyForTask, itemKeyForEvent } from '../db/repo';
import { markPanmatz, flushQueue } from './panmatzSync';
import { emitDataChanged } from './events';
import { refreshWidget } from '../widget/update';
import { rescheduleNotifications } from './notifications';

export async function afterChange({ widget = true } = {}) {
  emitDataChanged();
  await Promise.allSettled([widget ? refreshWidget() : null, rescheduleNotifications()]);
}

// ref = { source: 'task' | 'calendar' | 'panmatz', id, date }
export async function setItemDone(ref, done, opts) {
  await writeItemDone(ref, done);
  if (ref.source === 'panmatz') await flushQueue().catch(() => {});
  await afterChange(opts);
}

// רק השמירה המקומית (מהירה) — בלי סנכרון והתראות. הווידג'ט משתמש בזה כדי להתעדכן מיד.
export async function writeItemDone(ref, done) {
  if (ref.source === 'task') await setCompletion(itemKeyForTask(ref.id), ref.date, done);
  else if (ref.source === 'calendar') await setCompletion(itemKeyForEvent(ref.id), ref.date, done);
  else if (ref.source === 'panmatz') await markPanmatz(ref.date, ref.id, done, { flush: false });
}
