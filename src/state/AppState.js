// מצב גלובלי קל: קטגוריות, הגדרות, משתמש Supabase, גרסת נתונים וגיליון המשימה.
// הנתונים עצמם חיים ב-SQLite; המסכים טוענים טווחי ימים לפי "version".
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState as RNAppState } from 'react-native';
import { getCategories, getSettings, setSetting, loadRange } from '../db/repo';
import { onDataChanged } from '../services/events';
import { fullRefresh } from '../services/refresh';
import { afterChange } from '../services/actions';
import { supabase, currentUser } from '../services/supabase';
import { subscribePanmatz } from '../services/panmatzSync';
import { todayKey } from '../logic/dates';

const Ctx = createContext(null);

export function AppStateProvider({ children }) {
  const [version, setVersion] = useState(0);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(null);
  const [user, setUser] = useState(null);
  const [sheet, setSheet] = useState(null); // { task?, date }
  const [today, setToday] = useState(todayKey());
  const lastRefresh = useRef(0);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const reloadMeta = useCallback(async () => {
    const [cats, s] = await Promise.all([getCategories(), getSettings()]);
    setCategories(cats);
    setSettings(s);
  }, []);

  useEffect(() => {
    reloadMeta();
    return onDataChanged(() => {
      bump();
      reloadMeta();
    });
  }, [bump, reloadMeta]);

  // רענון מלא בפתיחה ובכל חזרה לאפליקציה (מוגבל לפעם בדקה), ומעבר יום בחצות
  useEffect(() => {
    const refresh = (force) => {
      setToday(todayKey());
      const now = Date.now();
      if (!force && now - lastRefresh.current < 60000) {
        bump();
        return;
      }
      lastRefresh.current = now;
      fullRefresh();
    };
    refresh(true);
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') {
        refresh(false);
        supabase?.auth.startAutoRefresh();
      } else {
        supabase?.auth.stopAutoRefresh();
      }
    });
    const timer = setInterval(() => {
      const k = todayKey();
      setToday((prev) => {
        if (prev !== k) fullRefresh();
        return k;
      });
    }, 30000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [bump]);

  // משתמש Supabase + האזנה בזמן אמת לפנמ"צ
  useEffect(() => {
    if (!supabase) return undefined;
    currentUser().then(setUser);
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    return subscribePanmatz(user.id, () => afterChange());
  }, [user]);

  const updateSetting = useCallback(async (key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
    await setSetting(key, value);
    await afterChange();
  }, []);

  const value = useMemo(
    () => ({
      version,
      today,
      categories,
      settings,
      user,
      sheet,
      bump,
      reloadMeta,
      updateSetting,
      openTaskSheet: (params) => setSheet({ key: Date.now(), ...params }),
      closeTaskSheet: () => setSheet(null),
    }),
    [version, today, categories, settings, user, sheet, bump, reloadMeta, updateSetting]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}

// טעינת פריטים לטווח ימים; מתרענן אוטומטית בכל שינוי
export function useRange(startKey, endKey) {
  const { version, today } = useAppState();
  const [state, setState] = useState({ byDate: {}, loaded: false });
  useEffect(() => {
    let alive = true;
    loadRange(startKey, endKey)
      .then((byDate) => alive && setState({ byDate, loaded: true }))
      .catch((e) => console.warn('טעינה נכשלה', e));
    return () => {
      alive = false;
    };
  }, [startKey, endKey, version, today]);
  return state;
}
