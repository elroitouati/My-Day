import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { MyDayWidget } from './MyDayWidget';
import { widgetPrefs, widgetState } from './prefs';
import { loadDay, getSettings, getDayOrder } from '../db/repo';
import { arrangeItems } from '../logic/arrange';
import { progress } from '../logic/dayItems';
import { todayKey, addDays } from '../logic/dates';

export const WIDGET_NAME = 'MyDay';

const bySource = (prefs) => (i) =>
  (i.source !== 'calendar' || prefs.showCalendar) && (i.source !== 'panmatz' || prefs.showPanmatz);

// כל מה שהווידג'ט צריך כדי להתרנדר — לפי העדפות הווידג'ט וסדר המשימות של היום
export async function widgetData(overrides) {
  const today = todayKey();
  const [all, s, order] = await Promise.all([loadDay(today), getSettings(), getDayOrder(today)]);
  const prefs = { ...widgetPrefs(s), ...(overrides || {}) };
  const app = { mode: s.theme_mode || 'light', accent: s.theme_accent || 'violet' };
  const sources = all.filter(bySource(prefs));
  const stats = progress(sources); // ההתקדמות נספרת מכל המשימות של היום
  const doneItems = !prefs.showDone ? 'hide' : s.theme_doneItems === 'hide' ? 'bottom' : s.theme_doneItems || 'inline';
  const items = arrangeItems(sources, { sortMode: s.theme_sortMode || 'auto', order, doneItems });
  const state = widgetState({ todayTotal: stats.total, todayOpen: stats.total - stats.done, visibleCount: items.length }, prefs);

  if (state.showTomorrow) {
    const tomorrow = addDays(today, 1);
    const tItems = (await loadDay(tomorrow)).filter(bySource(prefs));
    return { today, dateKey: tomorrow, isTomorrow: true, items: tItems, stats, mode: tItems.length ? 'list' : 'message', prefs, app };
  }
  return { today, dateKey: today, items, stats, mode: state.mode, prefs, app };
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
