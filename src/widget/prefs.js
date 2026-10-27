// העדפות עיצוב והתנהגות של הווידג'ט. נשמרות בהגדרות תחת widget_<שם>.

export const WIDGET_DEFAULTS = {
  // מראה
  theme: 'app', // app | light | dark — כמו האפליקציה או קבוע
  bg: 'solid', // solid | color | none | image
  bgColor: '#1A1D2E', // לרקע "צבע משלי"
  opacity: 100, // שקיפות הרקע (100 = אטום)
  image: null, // file:// של תמונת הרקע
  imageDim: 35, // הכהיית התמונה כדי שהטקסט ייקרא (0–70)
  textColor: 'auto', // auto | light | dark
  radius: 24,
  textSize: 'm', // s | m | l
  rows: 'comfy', // comfy | compact
  // תוכן
  showHeader: true,
  dateStyle: 'full', // full | short | none
  showProgress: true,
  showCounter: true,
  showAdd: true,
  showTime: true,
  showCategory: true,
  maxItems: 0, // 0 = הכל
  showDone: true,
  showCalendar: true,
  showPanmatz: true,
  // התנהגות
  fit: 'fill', // fill — ממלא את כל המקום | content — מתכווץ לגובה התוכן
  whenEmpty: 'message', // message | hide | tomorrow
  whenAllDone: 'message', // message | hide | tomorrow
};

export function widgetPrefs(settings = {}) {
  const out = {};
  Object.keys(WIDGET_DEFAULTS).forEach((k) => {
    out[k] = settings[`widget_${k}`] ?? WIDGET_DEFAULTS[k];
  });
  return out;
}

// ההחלטה מה הווידג'ט מציג — טהורה ומכוסה בבדיקות.
// מחזירה { mode: 'list' | 'message' | 'hidden', showTomorrow }
export function widgetState({ todayTotal, todayOpen, visibleCount }, prefs) {
  if (todayTotal === 0) {
    if (prefs.whenEmpty === 'hide') return { mode: 'hidden' };
    if (prefs.whenEmpty === 'tomorrow') return { mode: 'list', showTomorrow: true };
    return { mode: 'message' };
  }
  if (todayOpen === 0) {
    if (prefs.whenAllDone === 'hide') return { mode: 'hidden' };
    if (prefs.whenAllDone === 'tomorrow') return { mode: 'list', showTomorrow: true };
    if (visibleCount === 0) return { mode: 'message' };
  }
  return { mode: visibleCount ? 'list' : 'message' };
}
