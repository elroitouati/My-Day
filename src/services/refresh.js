// רענון מלא: יומן, פנמ"צ, התראות וווידג'ט. נקרא בפתיחת האפליקציה ובמשימת הרקע.
import { refreshCalendarCache } from './calendar';
import { syncPanmatz } from './panmatzSync';
import { rescheduleNotifications } from './notifications';
import { refreshWidget } from '../widget/update';
import { emitDataChanged, coalesce } from './events';

export const fullRefresh = coalesce(async () => {
  await Promise.allSettled([refreshCalendarCache(), syncPanmatz()]);
  emitDataChanged();
  await Promise.allSettled([refreshWidget(), rescheduleNotifications()]);
});
