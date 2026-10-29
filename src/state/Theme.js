// ערכת העיצוב הפעילה: בהיר/כהה, צבע מותג וסגנון סרגל הטאבים.
// שינוי ערכה מעדכן את הטוקנים החיים ובונה מחדש את הסגנונות בכל המסכים.
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { applyTheme } from '../design/tokens';
import { setSetting } from '../db/repo';
import { refreshWidget } from '../widget/update';

const ThemeCtx = createContext({ mode: 'light', accent: 'violet', tabStyle: 'classic', version: 0, setTheme: () => {} });

export const DEFAULT_THEME = {
  mode: 'light',
  accent: 'violet',
  tabStyle: 'classic',
  font: 'heebo',
  textSize: 'm',
  density: 'comfy',
  motion: true,
  haptics: true,
  doneItems: 'inline', // inline | bottom | hide
  sortMode: 'auto', // auto | manual
  startTab: 'Today',
  importantStyle: 'glow', // glow | badge | bold — איך משימה חשובה נראית
};

export function ThemeProvider({ initial, children }) {
  const [theme, setThemeState] = useState(() => {
    const t = { ...DEFAULT_THEME, ...(initial || {}) };
    applyTheme(t);
    return { ...t, version: 0 };
  });

  const setTheme = useCallback((patch) => {
    setThemeState((prev) => {
      const next = { ...prev, ...patch, version: prev.version + 1 };
      applyTheme(next);
      return next;
    });
    // נשמר, ואז גם הווידג'ט מתעדכן (צבעים, סדר, משימות שבוצעו)
    Promise.all(Object.entries(patch).map(([k, v]) => setSetting(`theme_${k}`, v)))
      .then(() => refreshWidget())
      .catch(() => {});
  }, []);

  const value = useMemo(() => ({ ...theme, setTheme }), [theme, setTheme]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}

// סגנונות שנבנים מחדש בכל החלפת ערכה. makeStyles = () => StyleSheet.create({...})
export function useStyles(makeStyles) {
  const { version } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => makeStyles(), [version, makeStyles]);
}

// קריאת הערכה השמורה (לפני הרינדור הראשון)
export function themeFromSettings(s) {
  const out = {};
  Object.keys(DEFAULT_THEME).forEach((k) => {
    out[k] = s[`theme_${k}`] ?? DEFAULT_THEME[k];
  });
  return out;
}
