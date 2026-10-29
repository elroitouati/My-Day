// מטפל באירועי הווידג'ט (רץ ברקע, גם כשהאפליקציה סגורה):
// הוספה / עדכון תקופתי (כולל מעבר לחצות) / שינוי גודל / לחיצה על עיגול ה-V.
import React from 'react';
import { MyDayWidget } from './MyDayWidget';
import { widgetData } from './update';
import { checkFeedback } from './feedback';
import { writeItemDone, afterChange } from '../services/actions';
import { flushQueue } from '../services/panmatzSync';

const POP_MS = 260;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function widgetTaskHandler({ widgetAction, clickAction, clickActionData, widgetInfo, renderWidget }) {
  if (widgetAction === 'WIDGET_DELETED') return;
  const draw = (data, extra) => renderWidget(<MyDayWidget {...data} {...extra} width={widgetInfo.width} height={widgetInfo.height} />);

  if (widgetAction === 'WIDGET_CLICK' && clickAction === 'TOGGLE' && clickActionData) {
    const { source, id, date, done } = clickActionData;
    const ref = { source, id: String(id), date };
    const next = !done;
    // קודם כל שמירה מקומית וציור — הסנכרון וההתראות אחר כך, כדי שה-V יופיע מיד
    try {
      await writeItemDone(ref, next);
    } catch (e) {
      console.warn('סימון מהווידג׳ט נכשל', e);
    }
    const data = await widgetData();
    checkFeedback(data.prefs, next);
    // "פופ": פריים מודגש לרגע, ואז המצב הרגיל
    draw(data, { pop: `${source}:${id}` });
    await wait(POP_MS);
    draw(data);
    if (source === 'panmatz') await flushQueue().catch(() => {});
    await afterChange({ widget: false });
    return;
  }

  draw(await widgetData());
}
