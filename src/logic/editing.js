// לוגיקת עריכה ומחיקה של משימות קבועות — "רק המופע הזה" / "המופע הזה וכל הבאים".
// פונקציות טהורות שמחזירות "תוכנית" של פעולות; שכבת ה-DB רק מבצעת אותה.

import { addDays } from './dates';

const TASK_FIELDS = ['title', 'category_id', 'color', 'notes', 'start_time', 'end_time', 'reminder', 'important', 'alarms'];

export function newId(prefix = 't') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// מחיקה
//  scope 'one'    → הוספת דילוג על היום הזה
//  scope 'future' → קיצוץ תאריך הסיום ליום שלפני; אם זה המופע הראשון — מחיקת המשימה כולה
export function planDelete(task, occurrenceKey, scope) {
  if (task.kind === 'once' || scope === 'all') return [{ op: 'delete', id: task.id }];
  if (scope === 'one') return [{ op: 'skip', id: task.id, date: occurrenceKey }];
  if (occurrenceKey <= task.start_date) return [{ op: 'delete', id: task.id }];
  return [{ op: 'update', id: task.id, patch: { end_date: addDays(occurrenceKey, -1) } }];
}

// עריכה. draft = המשימה החדשה כפי שנערכה בגיליון (כולל kind/rule/date).
//  משימה חד-פעמית    → עדכון ישיר
//  scope 'one'       → דילוג על המופע הזה + משימה חד-פעמית חדשה עם הערכים החדשים
//  scope 'future'    → קיצוץ המקורית ליום שלפני + משימה קבועה חדשה שמתחילה מהיום הזה
//                      (אם זה המופע הראשון — פשוט עדכון המשימה כולה)
export function planEdit(task, occurrenceKey, scope, draft, makeId = newId) {
  if (task.kind === 'once' || scope === 'all') {
    return [{ op: 'update', id: task.id, patch: pickTask(draft) }];
  }
  if (scope === 'one') {
    const id = makeId();
    return [
      { op: 'skip', id: task.id, date: occurrenceKey },
      {
        op: 'insert',
        task: {
          ...pickFields(draft),
          id,
          kind: 'once',
          date: draft.kind === 'once' && draft.date ? draft.date : occurrenceKey,
          rule: null,
          start_date: null,
          end_date: null,
        },
        carryCompletion: { fromId: task.id, fromDate: occurrenceKey },
      },
    ];
  }
  // future
  if (occurrenceKey <= task.start_date) {
    return [{ op: 'update', id: task.id, patch: pickTask({ ...draft, start_date: draft.start_date || task.start_date }) }];
  }
  const id = makeId();
  return [
    { op: 'update', id: task.id, patch: { end_date: addDays(occurrenceKey, -1) } },
    {
      op: 'insert',
      task: {
        ...pickTask(draft),
        id,
        start_date: draft.kind === 'recurring' ? occurrenceKey : null,
      },
      carryFutureCompletions: { fromId: task.id, fromDate: occurrenceKey },
    },
  ];
}

function pickFields(d) {
  const out = {};
  TASK_FIELDS.forEach((f) => {
    out[f] = d[f] ?? null;
  });
  return out;
}

function pickTask(d) {
  return {
    ...pickFields(d),
    kind: d.kind,
    date: d.kind === 'once' ? d.date : null,
    rule: d.kind === 'recurring' ? (typeof d.rule === 'string' ? d.rule : JSON.stringify(d.rule)) : null,
    start_date: d.kind === 'recurring' ? d.start_date : null,
    end_date: d.kind === 'recurring' ? d.end_date || null : null,
  };
}
