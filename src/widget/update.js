import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { MyDayWidget } from './MyDayWidget';
import { loadDay } from '../db/repo';
import { todayKey } from '../logic/dates';

export const WIDGET_NAME = 'MyDay';

export async function widgetData() {
  const today = todayKey();
  return { today, items: await loadDay(today) };
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
