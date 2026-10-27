// השלמה אוטומטית של משימות לפי מה שכבר הקלדת בעבר — טהור ומכוסה בבדיקות.
// סדר: מתחיל במה שהוקלד → מילה שמתחילה בזה → מכיל; בתוך כל קבוצה — הכי בשימוש, ואז הכי לאחרונה.

const norm = (s) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase();

export function matchIndex(title, query) {
  return norm(title).indexOf(norm(query));
}

export function rankSuggestions(history, query, limit = 5) {
  const q = norm(query);
  if (!q) return [];
  const scored = [];
  for (const h of history) {
    const t = norm(h.title);
    if (!t || t === q) continue; // אין טעם להציע בדיוק את מה שכבר כתוב
    const i = t.indexOf(q);
    if (i < 0) continue;
    const rank = i === 0 ? 0 : t[i - 1] === ' ' ? 1 : 2;
    scored.push({ h, rank });
  }
  scored.sort((a, b) => a.rank - b.rank || (b.h.uses || 0) - (a.h.uses || 0) || (b.h.last_used || 0) - (a.h.last_used || 0));
  return scored.slice(0, limit).map((s) => s.h);
}

// פיצול הכותרת לחלקים, כדי לצבוע את החלק שתואם להקלדה
export function highlightParts(title, query) {
  const i = matchIndex(title, query);
  if (i < 0 || !norm(query)) return [{ text: title, hit: false }];
  const len = norm(query).length;
  const lead = title.length - title.trimStart().length;
  const start = i + lead;
  return [
    { text: title.slice(0, start), hit: false },
    { text: title.slice(start, start + len), hit: true },
    { text: title.slice(start + len), hit: false },
  ].filter((p) => p.text);
}
