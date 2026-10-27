// הגדרות: קטגוריות, התראות, יומנים, סנכרון פנמ"צ וווידג'ט.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Linking, StyleSheet, ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';
import Screen from '../components/Screen';
import { Group, Row, Toggle, Chips, Button, Field } from '../components/controls';
import { pickTime } from '../components/pickers';
import CategorySheet from '../sheets/CategorySheet';
import { useAppState } from '../state/AppState';
import { setSetting } from '../db/repo';
import { afterChange } from '../services/actions';
import { fullRefresh } from '../services/refresh';
import { refreshWidget } from '../widget/update';
import { notificationPermission, requestNotificationPermission, REMINDER_OPTIONS } from '../services/notifications';
import { hasCalendarPermission, requestCalendarPermission, listCalendars, refreshCalendarCache, disableCalendar } from '../services/calendar';
import { supabaseConfigured, signIn, signUp, signOut, authErrorText } from '../services/supabase';
import { syncPanmatz, getLastSyncError } from '../services/panmatzSync';
import { clearPanmatz } from '../db/repo';
import { PANMATZ_CATEGORY, UNCATEGORIZED } from '../logic/dayItems';
import { colors, space, text, font } from '../design/tokens';

export default function SettingsScreen() {
  const { categories, settings, updateSetting } = useAppState();
  const [editCat, setEditCat] = useState(null);
  const [notifPerm, setNotifPerm] = useState(null);
  const [calendars, setCalendars] = useState([]);

  const loadPerms = useCallback(async () => {
    setNotifPerm(await notificationPermission().catch(() => null));
    if (settings?.calendarEnabled && (await hasCalendarPermission())) {
      setCalendars(await listCalendars().catch(() => []));
    }
  }, [settings?.calendarEnabled]);
  useEffect(() => {
    loadPerms();
  }, [loadPerms]);

  if (!settings) return null;

  const toggleNotifications = async (v) => {
    if (v) {
      const granted = await requestNotificationPermission();
      setNotifPerm(await notificationPermission());
      if (!granted) return;
    }
    await updateSetting('notificationsEnabled', v);
  };

  const toggleCalendar = async (v) => {
    if (!v) {
      await disableCalendar();
      setCalendars([]);
      await afterChange();
      return;
    }
    const granted = await requestCalendarPermission();
    if (!granted) {
      Linking.openSettings();
      return;
    }
    await setSetting('calendarEnabled', true);
    setCalendars(await listCalendars());
    await refreshCalendarCache();
    await afterChange();
  };

  const selectedIds = settings.calendarIds || calendars.map((c) => c.id);
  const toggleCal = async (id, on) => {
    const next = on ? [...new Set([...selectedIds, id])] : selectedIds.filter((x) => x !== id);
    await setSetting('calendarIds', next);
    await refreshCalendarCache();
    await afterChange();
  };

  return (
    <Screen eyebrow="My Day" title="הגדרות">
      <Group title="קטגוריות">
        {categories.map((c) => (
          <Row key={c.id} icon="pricetag" iconColor={c.color || UNCATEGORIZED.color} title={c.name} chevron onPress={() => setEditCat(c)} />
        ))}
        <Row icon="add" title="קטגוריה חדשה" onPress={() => setEditCat({ name: '', color: null })} />
      </Group>

      <Group
        title="התראות"
        footer={notifPerm && !notifPerm.granted && settings.notificationsEnabled ? 'ההתראות חסומות בהגדרות הטלפון. לחץ על "פתיחת הגדרות" כדי לאשר.' : null}
      >
        <Row icon="notifications-outline" title="התראות" trailing={<Toggle value={!!settings.notificationsEnabled && !!notifPerm?.granted} onValueChange={toggleNotifications} />} />
        {notifPerm && !notifPerm.granted ? <Row icon="open-outline" title="פתיחת הגדרות הטלפון" chevron onPress={() => Linking.openSettings()} /> : null}
        <Row icon="moon-outline" title="תזכורת ערב" subtitle="רק אם נשארו משימות פתוחות" trailing={<Toggle value={!!settings.eveningEnabled} onValueChange={(v) => updateSetting('eveningEnabled', v)} />} />
        {settings.eveningEnabled ? (
          <Row title="שעת תזכורת הערב" value={settings.eveningTime} chevron onPress={() => pickTime(settings.eveningTime, (t) => updateSetting('eveningTime', t))} />
        ) : null}
      </Group>
      <View style={styles.inlineBlock}>
        <Text style={styles.inlineLabel}>תזכורת ברירת מחדל למשימה עם שעה</Text>
        <Chips options={REMINDER_OPTIONS} value={settings.defaultReminder} onChange={(v) => updateSetting('defaultReminder', v)} />
      </View>

      <Group title="יומן Google" footer="קריאה בלבד מהיומנים שמסונכרנים לטלפון. סימון V נשמר רק כאן ולא נכתב ליומן.">
        <Row icon="calendar-outline" iconColor="#4C8DFF" title="הצגת אירועים מהיומן" trailing={<Toggle value={!!settings.calendarEnabled} onValueChange={toggleCalendar} />} />
        {settings.calendarEnabled
          ? calendars.map((c) => (
              <Row
                key={c.id}
                icon="ellipse"
                iconColor={c.color}
                title={c.title}
                subtitle={c.account}
                trailing={<Toggle value={selectedIds.includes(c.id)} onValueChange={(v) => toggleCal(c.id, v)} />}
              />
            ))
          : null}
      </Group>

      <PanmatzSection />

      <Group title="ווידג'ט" footer="לחיצה ארוכה על מסך הבית ← ווידג'טים ← My Day. הווידג'ט מתעדכן לבד, וגם בכל פתיחה של האפליקציה.">
        <Row icon="apps-outline" title="רענון הווידג'ט עכשיו" chevron onPress={() => refreshWidget()} />
      </Group>

      <Text style={styles.version}>My Day · גרסה {Constants.expoConfig?.version || '1.0.0'}</Text>

      <CategorySheet category={editCat} onClose={() => setEditCat(null)} />
    </Screen>
  );
}

function PanmatzSection() {
  const { user } = useAppState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  if (!supabaseConfigured) {
    return (
      <Group title='סנכרון פנמ"צ' footer="כדי להפעיל: צריך למלא את מפתחות Supabase בקובץ ‎.env ולבנות מחדש. ההוראות ב-SETUP.md.">
        <Row icon="cloud-offline-outline" iconColor={PANMATZ_CATEGORY.color} title="הסנכרון לא מוגדר" />
      </Group>
    );
  }

  const run = async (fn) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ error: true, text: authErrorText(e) });
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    const err = getLastSyncError();
    return (
      <Group title='סנכרון פנמ"צ' footer={msg?.text || (err ? `הסנכרון האחרון נכשל: ${authErrorText(err)}` : 'אימונים ומטרות מפנמ"צ מופיעים כאן, וסימון בכל צד מתעדכן בשני.')}>
        <Row icon="cloud-done-outline" iconColor={PANMATZ_CATEGORY.color} title="מחובר" subtitle={user.email} />
        <Row
          icon="sync-outline"
          title="סנכרון עכשיו"
          trailing={busy ? <ActivityIndicator color={colors.brand} /> : null}
          onPress={() => run(async () => {
            await syncPanmatz();
            await fullRefresh();
            setMsg({ text: getLastSyncError() ? `נכשל: ${authErrorText(getLastSyncError())}` : 'מסונכרן ✓' });
          })}
        />
        <Row
          icon="log-out-outline"
          title="התנתקות"
          danger
          onPress={() => run(async () => {
            await signOut();
            await clearPanmatz();
            await afterChange();
          })}
        />
      </Group>
    );
  }

  return (
    <View style={styles.inlineBlock}>
      <Text style={styles.inlineLabel}>סנכרון פנמ"צ</Text>
      <View style={styles.authCard}>
        <Text style={styles.authHint}>התחבר עם אותו חשבון שבו התחברת בפנמ"צ.</Text>
        <Field value={email} onChangeText={setEmail} placeholder="אימייל" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <Field value={password} onChangeText={setPassword} placeholder="סיסמה" secureTextEntry autoCapitalize="none" />
        {msg ? <Text style={[styles.authMsg, msg.error && styles.authErr]}>{msg.text}</Text> : null}
        <Button
          title={busy ? 'רגע…' : 'התחברות'}
          disabled={busy || !email || !password}
          onPress={() => run(async () => {
            await signIn(email, password);
            await fullRefresh();
          })}
        />
        <Button
          title="אין לי חשבון — הרשמה"
          kind="soft"
          disabled={busy || !email || password.length < 6}
          onPress={() => run(async () => {
            const r = await signUp(email, password);
            if (!r.session) setMsg({ text: 'נשלח אימייל אישור. אשר אותו ואז לחץ "התחברות".' });
            else await fullRefresh();
          })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inlineBlock: { gap: space[2] },
  inlineLabel: { ...text.caption, fontFamily: font.bold, color: colors.ink2, paddingHorizontal: space[2], textAlign: 'left' },
  authCard: { backgroundColor: colors.sunken, borderRadius: 24, padding: space[4], gap: space[3] },
  authHint: { ...text.sub, textAlign: 'left' },
  authMsg: { ...text.sub, color: colors.success, textAlign: 'left' },
  authErr: { color: colors.missed },
  version: { ...text.caption, textAlign: 'center', marginTop: space[4] },
});
