// מטפל באירועי הווידג'ט (רץ ברקע, גם כשהאפליקציה סגורה):
// הוספה / עדכון תקופתי (כולל מעבר לחצות) / שינוי גודל / לחיצה על עיגול ה-V.
import React from 'react';
import { MyDayWidget } from './MyDayWidget';
import { widgetData } from './update';
import { setItemDone } from '../services/actions';

export async function widgetTaskHandler({ widgetAction, clickAction, clickActionData, widgetInfo, renderWidget }) {
  if (widgetAction === 'WIDGET_DELETED') return;

  if (widgetAction === 'WIDGET_CLICK' && clickAction === 'TOGGLE' && clickActionData) {
    const { source, id, date, done } = clickActionData;
    try {
      // את הווידג'ט עצמו מרנדרים כאן למטה, לכן בלי עדכון כפול
      await setItemDone({ source, id: String(id), date }, !done, { widget: false });
    } catch (e) {
      console.warn('סימון מהווידג׳ט נכשל', e);
    }
  }

  const data = await widgetData();
  renderWidget(<MyDayWidget {...data} width={widgetInfo.width} height={widgetInfo.height} />);
}
