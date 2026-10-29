// שארית מגרסה 1.2.0, שבה היו צלצולים למשימות חשובות (הפיצ'ר הוסר):
// מבטלים צלצולים שאולי תוזמנו אז. ב-APK בלי המודול הנייטיב — לא עושה כלום.
import { requireOptionalNativeModule } from 'expo-modules-core';

const Native = requireOptionalNativeModule('MyDayAlarm');

export function cancelAllAlarms() {
  Native?.cancelAll();
}
