// מה מוצג בתא של יום בתצוגת חודש: רשימת "צ'יפים" קצרה במקום נקודות.
// אירועי יומן של יום שלם — פס מלא בצבע; משימות ואירועים עם שעה — פס צד צבעוני;
// אימוני פנמ"צ — צ'יפ אחד מקובץ עם מונה, כדי שלא ימלאו את התא.

const PANMATZ_TITLE = 'פנמ"צ';

export function monthChips(items, capacity) {
  const chips = [];
  const panmatz = items.filter((i) => i.source === 'panmatz');
  for (const i of items) {
    if (i.source === 'panmatz') continue;
    chips.push({
      key: i.uid,
      kind: i.source === 'calendar' && !i.startTime ? 'fill' : 'bar',
      title: i.important && !i.done ? `★ ${i.title}` : i.title,
      color: i.color,
      startTime: i.startTime,
      done: i.done,
    });
  }
  if (panmatz.length) {
    const done = panmatz.filter((p) => p.done).length;
    chips.push({
      key: 'panmatz',
      kind: 'bar',
      title: panmatz.length > 1 ? `${PANMATZ_TITLE} ${done}/${panmatz.length}` : panmatz[0].title,
      color: panmatz[0].color,
      startTime: null,
      done: done === panmatz.length,
      missed: panmatz.some((p) => p.missed),
    });
  }
  const rank = (c) => (c.kind === 'fill' ? 0 : c.title.startsWith('★') ? 1 : 2);
  chips.sort((a, b) => Number(a.done) - Number(b.done) || rank(a) - rank(b) || (a.startTime || '').localeCompare(b.startTime || ''));
  if (chips.length <= capacity) return { chips, more: 0 };
  // שורה אחרונה מפנה מקום ל-"+N"
  const shown = chips.slice(0, Math.max(0, capacity - 1));
  return { chips: shown, more: chips.length - shown.length };
}
