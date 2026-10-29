// הגדרות: קטגוריות, התראות, יומנים, סנכרון פנמ"צ וווידג'ט.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Linking, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import Screen from '../components/Screen';
import { Group, Row, Toggle, Chips, Button, Field } from '../components/controls';
import { pickTime } from '../components/pickers';
import CategorySheet from '../sheets/CategorySheet';
import ColorPicker from '../components/ColorPicker';
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
import { colors, space, text, font, ACCENTS, TAB_STYLES, FONTS, TEXT_SIZES, DENSITIES, fs } from '../design/tokens';
import { useStyles, useTheme } from '../state/Theme';
import { haptic } from '../design/feedback';
import WhatsNewSheet from '../sheets/WhatsNewSheet';
import { checkForUpdate, applyUpdate, currentBuildDate, updatesEnabled, useUpdateState } from '../services/useUpdates';

export default function SettingsScreen({ navigation }) {
  const styles = useStyles(makeStyles);
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
      <AppearanceSection />

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
        <Row
          icon="notifications-outline"
          title="התראות"
          trailing={<Toggle value={!!settings.notificationsEnabled && !!notifPerm?.granted} onValueChange={toggleNotifications} />}
        />
        {notifPerm && !notifPerm.granted ? <Row icon="open-outline" title="פתיחת הגדרות הטלפון" chevron onPress={() => Linking.openSettings()} /> : null}
        <Row
          icon="moon-outline"
          title="תזכורת ערב"
          subtitle="רק אם נשארו משימות פתוחות"
          trailing={<Toggle value={!!settings.eveningEnabled} onValueChange={(v) => updateSetting('eveningEnabled', v)} />}
        />
        {settings.eveningEnabled ? (
          <Row
            title="שעת תזכורת הערב"
            value={settings.eveningTime}
            chevron
            onPress={() => pickTime(settings.eveningTime, (t) => updateSetting('eveningTime', t))}
          />
        ) : null}
        <Row
          icon="sunny-outline"
          title="תזכורת בוקר"
          subtitle="כמה משימות מחכות לך היום"
          trailing={<Toggle value={!!settings.morningEnabled} onValueChange={(v) => updateSetting('morningEnabled', v)} />}
        />
        {settings.morningEnabled ? (
          <Row
            title="שעת תזכורת הבוקר"
            value={settings.morningTime}
            chevron
            onPress={() => pickTime(settings.morningTime, (t) => updateSetting('morningTime', t))}
          />
        ) : null}
      </Group>

      <Group title="שעות שקט" footer="בשעות השקט לא נשלחות התראות בכלל. שבת: משישי 16:00 עד מוצאי שבת 20:00.">
        <Row icon="moon" title="שעות שקט" trailing={<Toggle value={!!settings.quietEnabled} onValueChange={(v) => updateSetting('quietEnabled', v)} />} />
        {settings.quietEnabled ? (
          <Row title="מ-" value={settings.quietFrom} chevron onPress={() => pickTime(settings.quietFrom, (t) => updateSetting('quietFrom', t))} />
        ) : null}
        {settings.quietEnabled ? (
          <Row title="עד" value={settings.quietTo} chevron onPress={() => pickTime(settings.quietTo, (t) => updateSetting('quietTo', t))} />
        ) : null}
        <Row
          icon="flame-outline"
          title="בלי התראות בשבת"
          trailing={<Toggle value={!!settings.quietShabbat} onValueChange={(v) => updateSetting('quietShabbat', v)} />}
        />
      </Group>

      <BehaviorSection />
      <View style={styles.inlineBlock}>
        <Text style={styles.inlineLabel}>תזכורת ברירת מחדל למשימה עם שעה</Text>
        <Chips options={REMINDER_OPTIONS} value={settings.defaultReminder} onChange={(v) => updateSetting('defaultReminder', v)} />
      </View>

      <Group title="יומן Google" footer="קריאה בלבד מהיומנים שמסונכרנים לטלפון. סימון V נשמר רק כאן ולא נכתב ליומן.">
        <Row
          icon="calendar-outline"
          iconColor="#4C8DFF"
          title="הצגת אירועים מהיומן"
          trailing={<Toggle value={!!settings.calendarEnabled} onValueChange={toggleCalendar} />}
        />
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
        <Row
          icon="color-palette-outline"
          title="עיצוב והתאמת הווידג'ט"
          subtitle="רקע, תמונה, צבעים, מה מוצג ומה קורה כשאין משימות"
          chevron
          onPress={() => navigation.navigate('WidgetEditor')}
        />
        <Row icon="refresh-outline" title="רענון הווידג'ט עכשיו" chevron onPress={() => refreshWidget()} />
      </Group>

      <UpdatesSection />

      <CategorySheet category={editCat} onClose={() => setEditCat(null)} />
    </Screen>
  );
}

// התנהגות: סדר המשימות, משימות שבוצעו, מסך פתיחה, אנימציות ורטט
function BehaviorSection() {
  const styles = useStyles(makeStyles);
  const { doneItems, sortMode, startTab, motion: motionOn, haptics, setTheme } = useTheme();
  return (
    <View style={styles.inlineBlock}>
      <Text style={styles.inlineLabel}>הרשימה והתנהגות</Text>
      <View style={styles.appearance}>
        <Text style={styles.subLabel}>משימות שבוצעו</Text>
        <Chips
          options={[
            { value: 'inline', label: 'במקום' },
            { value: 'bottom', label: 'בסוף הרשימה' },
            { value: 'hide', label: 'להסתיר' },
          ]}
          value={doneItems}
          onChange={(v) => setTheme({ doneItems: v })}
        />
        <Text style={styles.subLabel}>סדר המשימות</Text>
        <Chips
          options={[
            { value: 'auto', label: 'אוטומטי לפי שעה' },
            { value: 'manual', label: 'ידני (בגרירה)' },
          ]}
          value={sortMode}
          onChange={(v) => setTheme({ sortMode: v })}
        />
        <Text style={styles.hintText}>בסדר ידני: כפתור "סידור" במסך היום, ואז גוררים. לחיצה ארוכה על משימה מעבירה אותה להיום או למחר.</Text>
        <Text style={styles.subLabel}>המסך שנפתח</Text>
        <Chips
          options={[
            { value: 'Today', label: 'היום' },
            { value: 'Week', label: 'שבוע' },
            { value: 'Month', label: 'חודש' },
          ]}
          value={startTab}
          onChange={(v) => setTheme({ startTab: v })}
        />
      </View>
      <Group>
        <Row icon="sparkles-outline" title="אנימציות" trailing={<Toggle value={motionOn !== false} onValueChange={(v) => setTheme({ motion: v })} />} />
        <Row icon="phone-portrait-outline" title="רטט" trailing={<Toggle value={haptics !== false} onValueChange={(v) => setTheme({ haptics: v })} />} />
      </Group>
    </View>
  );
}

// מראה: בהיר/כהה, צבע מותג וסגנון סרגל הטאבים. הגופנים והמבנה לא משתנים.
function AppearanceSection() {
  const styles = useStyles(makeStyles);
  const { mode, accent, tabStyle, font: fontId, textSize, density, setTheme } = useTheme();
  const isCustom = accent.startsWith('#');
  const [customOpen, setCustomOpen] = useState(isCustom);
  const [custom, setCustom] = useState(isCustom ? accent : '#6C5CFF');
  const debounce = useRef(null);
  // בגרירה בבוחר הצבעים מעדכנים את האפליקציה אחרי עצירה קצרה, לא בכל תזוזה
  const pickCustom = (hex) => {
    setCustom(hex);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => change({ accent: hex }), 250);
  };
  const change = (patch) => {
    haptic.tap();
    setTheme(patch);
  };
  return (
    <View style={styles.inlineBlock}>
      <Text style={styles.inlineLabel}>מראה</Text>
      <View style={styles.appearance}>
        <View style={styles.modeRow}>
          {[
            { id: 'light', label: 'בהיר', icon: 'sunny' },
            { id: 'dark', label: 'כהה', icon: 'moon' },
          ].map((m) => {
            const on = mode === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => change({ mode: m.id })}
                style={[styles.modeBtn, on && styles.modeBtnOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <Ionicons name={m.icon} size={18} color={on ? colors.onBrand : colors.ink2} />
                <Text style={[styles.modeText, on && styles.modeTextOn]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.subLabel}>צבע האפליקציה</Text>
        <View style={styles.accents}>
          {ACCENTS.map((a) => {
            const on = accent === a.id;
            const c = mode === 'dark' ? a.brandDark : a.brand;
            return (
              <Pressable
                key={a.id}
                onPress={() => change({ accent: a.id })}
                style={styles.accentItem}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={a.name}
              >
                <View style={[styles.accentDot, { backgroundColor: c }, on && { borderColor: colors.ink }]}>
                  {on ? <Ionicons name="checkmark" size={20} color="#FFFFFF" /> : null}
                </View>
                <Text style={[styles.accentName, on && styles.accentNameOn]}>{a.name}</Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => {
              setCustomOpen(true);
              change({ accent: custom });
            }}
            style={styles.accentItem}
            accessibilityRole="radio"
            accessibilityState={{ selected: isCustom }}
            accessibilityLabel="צבע משלי"
          >
            <View
              style={[
                styles.accentDot,
                styles.customDot,
                isCustom && {
                  backgroundColor: custom,
                  borderColor: colors.ink,
                },
              ]}
            >
              <Ionicons name={isCustom ? 'checkmark' : 'color-palette'} size={20} color={isCustom ? '#FFFFFF' : colors.ink2} />
            </View>
            <Text style={[styles.accentName, isCustom && styles.accentNameOn]}>צבע משלי</Text>
          </Pressable>
        </View>
        {customOpen && isCustom ? <ColorPicker value={custom} onChange={pickCustom} allowNone={false} /> : null}

        <Text style={styles.subLabel}>סרגל הכפתורים למטה</Text>
        <Chips options={TAB_STYLES.map((t) => ({ value: t.id, label: t.name }))} value={tabStyle} onChange={(v) => change({ tabStyle: v })} />

        <Text style={styles.subLabel}>גופן</Text>
        <Chips
          options={FONTS.map((f) => ({
            value: f.id,
            label: f.name,
            family: f.bold,
          }))}
          value={fontId}
          onChange={(v) => change({ font: v })}
          fontFor={(o) => o.family}
        />

        <Text style={styles.subLabel}>גודל טקסט</Text>
        <Chips options={TEXT_SIZES.map((t) => ({ value: t.id, label: t.name }))} value={textSize} onChange={(v) => change({ textSize: v })} />

        <Text style={styles.subLabel}>צפיפות הרשימה</Text>
        <Chips options={DENSITIES.map((t) => ({ value: t.id, label: t.name }))} value={density} onChange={(v) => change({ density: v })} />
      </View>
    </View>
  );
}

// פנמ"צ אופציונלי: מי שלא משתמש בו רואה רק מתג אחד
function PanmatzSection() {
  const { user, settings, updateSetting } = useAppState();
  const enabled = settings.panmatzEnabled ?? !!user;
  return (
    <>
      <Group footer={enabled ? null : 'למי שמשתמש גם באפליקציית פנמ"צ — האימונים יופיעו כאן וסימון בצד אחד יתעדכן בשני.'}>
        <Row
          icon="barbell-outline"
          iconColor={PANMATZ_CATEGORY.color}
          title='סנכרון עם פנמ"צ'
          trailing={<Toggle value={enabled} onValueChange={(v) => updateSetting('panmatzEnabled', v)} />}
        />
      </Group>
      {enabled ? <PanmatzAccount /> : null}
    </>
  );
}

function PanmatzAccount() {
  const styles = useStyles(makeStyles);
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
      <Group
        title='סנכרון פנמ"צ'
        footer={msg?.text || (err ? `הסנכרון האחרון נכשל: ${authErrorText(err)}` : 'אימונים ומטרות מפנמ"צ מופיעים כאן, וסימון בכל צד מתעדכן בשני.')}
      >
        <Row icon="cloud-done-outline" iconColor={PANMATZ_CATEGORY.color} title="מחובר" subtitle={user.email} />
        <Row
          icon="sync-outline"
          title="סנכרון עכשיו"
          trailing={busy ? <ActivityIndicator color={colors.brand} /> : null}
          onPress={() =>
            run(async () => {
              await syncPanmatz();
              await fullRefresh();
              setMsg({
                text: getLastSyncError() ? `נכשל: ${authErrorText(getLastSyncError())}` : 'מסונכרן ✓',
              });
            })
          }
        />
        <Row
          icon="log-out-outline"
          title="התנתקות"
          danger
          onPress={() =>
            run(async () => {
              await signOut();
              await clearPanmatz();
              await afterChange();
            })
          }
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
          onPress={() =>
            run(async () => {
              await signIn(email, password);
              await fullRefresh();
            })
          }
        />
        <Button
          title="אין לי חשבון — הרשמה"
          kind="soft"
          disabled={busy || !email || password.length < 6}
          onPress={() =>
            run(async () => {
              const r = await signUp(email, password);
              if (!r.session)
                setMsg({
                  text: 'נשלח אימייל אישור. אשר אותו ואז לחץ "התחברות".',
                });
              else await fullRefresh();
            })
          }
        />
      </View>
    </View>
  );
}

// עדכונים: גרסה, בדיקה ידנית, הפעלה ו"מה חדש"
function UpdatesSection() {
  const { status, checkedAt } = useUpdateState();
  const [news, setNews] = useState(false);
  const built = currentBuildDate();
  const builtText = built
    ? `עודכן ${built.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })} ${built.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`
    : null;
  const STATUS = {
    checking: 'בודק…',
    downloading: 'מוריד עדכון…',
    ready: 'עדכון מוכן — לחיצה להפעלה',
    uptodate: 'יש לך את הגרסה האחרונה ✓',
    error: 'הבדיקה נכשלה — אין חיבור?',
    disabled: 'לא זמין בגרסת פיתוח',
  };
  const busy = status === 'checking' || status === 'downloading';
  return (
    <>
      <Group title="עדכונים" footer="עדכונים נבדקים לבד בכל פתיחה וגם ברקע. כשיש עדכון חדש מקבלים התראה.">
        <Row icon="information-circle-outline" title={`My Day · גרסה ${Constants.expoConfig?.version || '1.0.0'}`} subtitle={builtText} />
        <Row
          icon={status === 'ready' ? 'sparkles' : 'cloud-download-outline'}
          title={status === 'ready' ? 'הפעלת העדכון' : 'בדיקת עדכונים'}
          subtitle={STATUS[status] || (checkedAt ? null : 'בודק אם יש גרסה חדשה')}
          trailing={busy ? <ActivityIndicator color={colors.brand} /> : null}
          onPress={busy || !updatesEnabled() ? undefined : () => (status === 'ready' ? applyUpdate().catch(() => {}) : checkForUpdate())}
        />
        <Row icon="gift-outline" title="מה חדש" chevron onPress={() => setNews(true)} />
      </Group>
      <WhatsNewSheet visible={news} onClose={() => setNews(false)} all />
    </>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    inlineBlock: { gap: space[2] },
    hintText: { ...text.caption, textAlign: 'left' },
    appearance: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: space[4],
      gap: space[3],
    },
    modeRow: {
      flexDirection: 'row',
      gap: space[2],
      backgroundColor: colors.sunken,
      borderRadius: 16,
      padding: 4,
    },
    modeBtn: {
      flex: 1,
      height: 42,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    modeBtnOn: { backgroundColor: colors.brand },
    modeText: { fontFamily: font.bold, fontSize: fs(15), color: colors.ink2 },
    modeTextOn: { color: colors.onBrand },
    subLabel: {
      ...text.caption,
      fontFamily: font.bold,
      color: colors.ink2,
      textAlign: 'left',
      marginTop: space[1],
    },
    accents: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
    accentItem: { alignItems: 'center', gap: 4, minWidth: 48 },
    accentDot: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: 'transparent',
    },
    customDot: { backgroundColor: colors.sunken, borderColor: colors.line },
    accentName: { ...text.caption },
    accentNameOn: { color: colors.ink, fontFamily: font.bold },
    inlineLabel: {
      ...text.caption,
      fontFamily: font.bold,
      color: colors.ink2,
      paddingHorizontal: space[2],
      textAlign: 'left',
    },
    authCard: {
      backgroundColor: colors.sunken,
      borderRadius: 24,
      padding: space[4],
      gap: space[3],
    },
    authHint: { ...text.sub, textAlign: 'left' },
    authMsg: { ...text.sub, color: colors.success, textAlign: 'left' },
    authErr: { color: colors.missed },
  });
