// ערכת העיצוב הפעילה: בהיר/כהה, צבע מותג וסגנון סרגל הטאבים.
// שינוי ערכה מעדכן את הטוקנים החיים ובונה מחדש את הסגנונות בכל המסכים.
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { applyTheme } from '../design/tokens';
import { setSetting } from '../db/repo';

const ThemeCtx = createContext({ mode: 'light', accent: 'violet', tabStyle: 'classic', version: 0, setTheme: () => {} });

export const DEFAULT_THEME = { mode: 'light', accent: 'violet', tabStyle: 'classic' };

export function ThemeProvider({ initial, children }) {
  const [theme, setThemeState] = useState(() => {
    const t = { ...DEFAULT_THEME, ...(initial || {}) };
    applyTheme(t.mode, t.accent);
    return { ...t, version: 0 };
  });

  const setTheme = useCallback((patch) => {
    setThemeState((prev) => {
      const next = { ...prev, ...patch, version: prev.version + 1 };
      applyTheme(next.mode, next.accent);
      return next;
    });
    Object.entries(patch).forEach(([k, v]) => setSetting(`theme_${k}`, v).catch(() => {}));
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
  return {
    mode: s.theme_mode || DEFAULT_THEME.mode,
    accent: s.theme_accent || DEFAULT_THEME.accent,
    tabStyle: s.theme_tabStyle || DEFAULT_THEME.tabStyle,
  };
}
