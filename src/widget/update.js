import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { MyDayWidget } from './MyDayWidget';
import { loadDay, getSettings, getDayOrder } from '../db/repo';
import { arrangeItems } from '../logic/arrange';
import { progress } from '../logic/dayItems';
import { buildPalette } from '../design/tokens';
import { todayKey } from '../logic/dates';

export const WIDGET_NAME = 'MyDay';

export async function widgetData() {
  const today = todayKey();
  const [all, s, order] = await Promise.all([loadDay(today), getSettings(), getDayOrder(today)]);
  // מה מוצג בווידג'ט — לפי ההגדרות (ההתקדמות נספרת מכל המשימות של היום)
  const sources = all.filter(
    (i) => (i.source !== 'calendar' || s.widget_showCalendar !== false) && (i.source !== 'panmatz' || s.widget_showPanmatz !== false)
  );
  const doneItems = s.widget_showDone === false ? 'hide' : s.theme_doneItems === 'hide' ? 'bottom' : s.theme_doneItems || 'inline';
  const items = arrangeItems(sources, { sortMode: s.theme_sortMode || 'auto', order, doneItems });
  return {
    today,
    items,
    stats: progress(sources),
    opacity: s.widget_opacity ?? 100,
    // הווידג'ט באותה ערכה כמו האפליקציה (בהיר/כהה + צבע)
    palette: buildPalette(s.theme_mode || 'light', s.theme_accent || 'violet'),
  };
}

// עדכון כל עותקי הווידג'ט שעל מסך הבית
export async function refreshWidget() {
  if (Platform.OS !== 'android') return;
  try {
    const data = await widgetData();
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: (info) => <MyDayWidget {...data} width={info.width} height={info.height} />,
    });
  } catch (e) {
    console.warn('עדכון ווידג׳ט נכשל', e);
  }
}
