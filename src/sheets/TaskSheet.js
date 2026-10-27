// גיליון הוספה ועריכה של משימה.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import BottomSheet from '../components/BottomSheet';
import { Button, Chips, DayToggles, Field, Label, Stepper, Group, Row, Toggle } from '../components/controls';
import { pickDate, pickTime } from '../components/pickers';
import { useAppState } from '../state/AppState';
import { createTask, editTask, removeTask, saveCategory } from '../db/repo';
import ColorPicker from '../components/ColorPicker';
import { afterChange } from '../services/actions';
import { REMINDER_OPTIONS } from '../services/notifications';
import { parseRule, validateRule } from '../logic/recurrence';
import { newId } from '../logic/editing';
import { formatHebDate, weekday, keyToDate, timeToMinutes, minutesToTime, todayKey } from '../logic/dates';
import { PALETTE, colors, space, text, font } from '../design/tokens';
import { useStyles } from '../state/Theme';

const REPEAT = [
  { value: 'once', label: 'חד-פעמית' },
  { value: 'daily', label: 'כל יום' },
  { value: 'weekly', label: 'ימים בשבוע' },
  { value: 'interval', label: 'כל X ימים' },
  { value: 'monthly', label: 'פעם בחודש' },
];

function initialDraft(task, date, settings, categories) {
  const base = date || todayKey();
  if (!task) {
    return {
      title: '',
      category_id: null, // קטגוריה לא חובה
      notes: '',
      timed: false,
      start_time: '09:00',
      end_time: '10:00',
      reminder: settings?.defaultReminder ?? 10,
      repeat: 'once',
      date: base,
      days: [weekday(base)],
      every: 2,
      monthDay: keyToDate(base).getDate(),
      start_date: base,
      hasEnd: false,
      end_date: null,
    };
  }
  const rule = parseRule(task.rule) || {};
  return {
    title: task.title,
    category_id: task.category_id,
    notes: task.notes || '',
    timed: !!task.start_time,
    start_time: task.start_time || '09:00',
    end_time: task.end_time || '',
    reminder: task.reminder ?? null,
    repeat: task.kind === 'once' ? 'once' : rule.freq,
    date: task.kind === 'once' ? task.date : date,
    days: rule.days || [weekday(date || base)],
    every: rule.every || 2,
    monthDay: rule.day || keyToDate(date || base).getDate(),
    start_date: task.start_date || date || base,
    hasEnd: !!task.end_date,
    end_date: task.end_date,
  };
}

function toTask(d) {
  const once = d.repeat === 'once';
  let rule = null;
  if (!once) {
    if (d.repeat === 'daily') rule = { freq: 'daily' };
    if (d.repeat === 'weekly') rule = { freq: 'weekly', days: d.days };
    if (d.repeat === 'interval') rule = { freq: 'interval', every: d.every };
    if (d.repeat === 'monthly') rule = { freq: 'monthly', day: d.monthDay };
  }
  return {
    title: d.title.trim(),
    category_id: d.category_id,
    notes: d.notes.trim() || null,
    start_time: d.timed ? d.start_time : null,
    end_time: d.timed && d.end_time ? d.end_time : null,
    reminder: d.timed ? d.reminder : null,
    kind: once ? 'once' : 'recurring',
    date: once ? d.date : null,
    rule,
    start_date: once ? null : d.start_date,
    end_date: !once && d.hasEnd ? d.end_date : null,
  };
}

function askScope(verb) {
  return new Promise((resolve) => {
    Alert.alert(
      `${verb} משימה קבועה`,
      'על אילו מופעים להחיל את השינוי?',
      [
        { text: 'ביטול', style: 'cancel', onPress: () => resolve(null) },
        { text: 'המופע הזה וכל הבאים', onPress: () => resolve('future') },
        { text: 'רק המופע הזה', onPress: () => resolve('one') },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}

export default function TaskSheet() {
  const { sheet, closeTaskSheet, categories, settings, reloadMeta } = useAppState();
  return (
    <BottomSheet visible={!!sheet} onClose={closeTaskSheet}>
      {sheet ? <TaskForm key={sheet.key} sheet={sheet} categories={categories} settings={settings} reloadMeta={reloadMeta} onDone={closeTaskSheet} /> : null}
    </BottomSheet>
  );
}

const NEW_CATEGORY = '__new';

function TaskForm({ sheet, categories, settings, reloadMeta, onDone }) {
  const styles = useStyles(makeStyles);
  const { task, date } = sheet;
  const [d, setD] = useState(() => initialDraft(task, date, settings, categories));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  const [newCat, setNewCat] = useState(null); // { name, color } כשיוצרים קטגוריה מתוך הגיליון
  const catOptions = useMemo(
    () => [
      { value: null, label: 'בלי קטגוריה' },
      ...categories.map((c) => ({ value: c.id, label: c.name, color: c.color || null })),
      { value: NEW_CATEGORY, label: '+ קטגוריה חדשה' },
    ],
    [categories]
  );
  const chooseCategory = (v) => {
    if (v === NEW_CATEGORY) setNewCat({ name: '', color: PALETTE[categories.length % PALETTE.length] });
    else {
      setNewCat(null);
      set({ category_id: v });
    }
  };
  const createCategory = async () => {
    if (!newCat?.name.trim()) return;
    const id = await saveCategory({ name: newCat.name.trim(), color: newCat.color || '' });
    await reloadMeta();
    set({ category_id: id });
    setNewCat(null);
  };

  const setStart = (t) => {
    const s = timeToMinutes(t);
    const e = timeToMinutes(d.end_time);
    const dur = e != null && timeToMinutes(d.start_time) != null ? e - timeToMinutes(d.start_time) : 60;
    set({ start_time: t, end_time: e == null || e <= s ? minutesToTime(Math.min(s + Math.max(dur, 15), 23 * 60 + 59)) : d.end_time });
  };

  const save = async () => {
    const t = toTask(d);
    if (!t.title) return setError('צריך כותרת למשימה');
    if (t.kind === 'recurring' && !validateRule(t.rule)) return setError('בחר לפחות יום אחד בשבוע');
    if (t.end_time && timeToMinutes(t.end_time) <= timeToMinutes(t.start_time)) return setError('שעת הסיום צריכה להיות אחרי שעת ההתחלה');
    if (t.end_date && t.end_date < t.start_date) return setError('תאריך הסיום לפני תאריך ההתחלה');
    setBusy(true);
    try {
      if (!task) {
        await createTask({ ...t, id: newId(), rule: t.rule ? JSON.stringify(t.rule) : null });
      } else {
        const scope = task.kind === 'recurring' ? await askScope('עריכת') : 'all';
        if (!scope) return;
        await editTask(task, date, scope, t);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await afterChange();
      onDone();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    let scope = 'all';
    if (task.kind === 'recurring') {
      scope = await askScope('מחיקת');
      if (!scope) return;
    } else {
      const ok = await new Promise((r) =>
        Alert.alert('למחוק את המשימה?', task.title, [
          { text: 'ביטול', style: 'cancel', onPress: () => r(false) },
          { text: 'מחיקה', style: 'destructive', onPress: () => r(true) },
        ])
      );
      if (!ok) return;
    }
    await removeTask(task, date, scope);
    await afterChange();
    onDone();
  };

  const recurring = d.repeat !== 'once';

  return (
    <View style={styles.form}>
      <Text style={styles.heading}>{task ? 'עריכת משימה' : 'משימה חדשה'}</Text>

      <Field
        value={d.title}
        onChangeText={(v) => {
          set({ title: v });
          setError(null);
        }}
        placeholder="מה צריך לעשות?"
        autoFocus={!task}
        returnKeyType="done"
      />

      <Label>קטגוריה</Label>
      <Chips options={catOptions} value={newCat ? NEW_CATEGORY : d.category_id} onChange={chooseCategory} colorFor={(o) => o.color} />
      {newCat ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.newCat}>
          <Field value={newCat.name} onChangeText={(name) => setNewCat((c) => ({ ...c, name }))} placeholder="שם הקטגוריה, למשל: עבודה" autoFocus />
          <ColorPicker value={newCat.color} onChange={(color) => setNewCat((c) => ({ ...c, color }))} />
          <Button title="יצירת הקטגוריה" kind="soft" icon="add" onPress={createCategory} disabled={!newCat.name.trim()} />
        </Animated.View>
      ) : null}

      <Label>חזרה</Label>
      <Chips options={REPEAT} value={d.repeat} onChange={(v) => set({ repeat: v })} />

      <Animated.View layout={LinearTransition} style={styles.block}>
        {d.repeat === 'weekly' ? (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <DayToggles value={d.days} onChange={(days) => set({ days })} />
          </Animated.View>
        ) : null}
        {d.repeat === 'interval' ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.inline}>
            <Text style={styles.inlineText}>כל</Text>
            <Stepper value={d.every} onChange={(every) => set({ every })} min={1} max={365} suffix="ימים" />
          </Animated.View>
        ) : null}
        {d.repeat === 'monthly' ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.inline}>
            <Text style={styles.inlineText}>בכל חודש ביום</Text>
            <Stepper value={d.monthDay} onChange={(monthDay) => set({ monthDay })} min={1} max={31} />
          </Animated.View>
        ) : null}
        {d.repeat === 'monthly' && d.monthDay > 28 ? (
          <Text style={styles.hint}>בחודש שאין בו יום {d.monthDay} — המשימה תופיע ביום האחרון של החודש.</Text>
        ) : null}

        <Group>
          {recurring ? (
            <Row icon="play-outline" title="מתחילה ב-" value={formatHebDate(d.start_date, { year: true })} onPress={() => pickDate(d.start_date, (k) => set({ start_date: k }))} />
          ) : (
            <Row icon="calendar-outline" title="תאריך" value={formatHebDate(d.date, { year: true })} onPress={() => pickDate(d.date, (k) => set({ date: k }))} />
          )}
          {recurring ? (
            <Row
              icon="flag-outline"
              title="תאריך סיום"
              subtitle={d.hasEnd ? null : 'בלי תאריך סיום'}
              value={d.hasEnd && d.end_date ? formatHebDate(d.end_date, { year: true }) : null}
              onPress={d.hasEnd ? () => pickDate(d.end_date || d.start_date, (k) => set({ end_date: k }), { minimumKey: d.start_date }) : undefined}
              trailing={<Toggle value={d.hasEnd} onValueChange={(v) => set({ hasEnd: v, end_date: v ? d.end_date || d.start_date : null })} />}
            />
          ) : null}
          <Row
            icon="time-outline"
            title="שעה"
            subtitle={d.timed ? null : 'כל היום'}
            trailing={<Toggle value={d.timed} onValueChange={(v) => set({ timed: v })} />}
          />
          {d.timed ? <Row title="התחלה" value={d.start_time} onPress={() => pickTime(d.start_time, setStart)} /> : null}
          {d.timed ? (
            <Row title="סיום" value={d.end_time || 'ללא'} onPress={() => pickTime(d.end_time || d.start_time, (t) => set({ end_time: t }))} />
          ) : null}
        </Group>

        {d.timed ? (
          <>
            <Label>תזכורת לפני</Label>
            <Chips options={REMINDER_OPTIONS} value={d.reminder} onChange={(v) => set({ reminder: v })} />
          </>
        ) : null}

        <Label>הערות</Label>
        <Field value={d.notes} onChangeText={(v) => set({ notes: v })} placeholder="אופציונלי" multiline />

        {error ? (
          <View style={styles.error}>
            <Ionicons name="alert-circle" size={16} color={colors.missed} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button title={task ? 'שמירה' : 'הוספה'} icon="checkmark" onPress={save} disabled={busy} />
        {task ? (
          <Pressable onPress={remove} style={styles.delete} accessibilityRole="button">
            <Ionicons name="trash-outline" size={18} color={colors.missed} />
            <Text style={styles.deleteText}>מחיקת משימה</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  form: { gap: space[4] },
  block: { gap: space[4] },
  newCat: { gap: space[3], backgroundColor: colors.sunken, borderRadius: 24, padding: space[4] },
  heading: { ...text.title, textAlign: 'left' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  inlineText: { ...text.body },
  hint: { ...text.caption, textAlign: 'left', marginTop: -space[2] },
  error: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.missedSoft, padding: space[3], borderRadius: 14 },
  errorText: { ...text.sub, color: colors.missed, fontFamily: font.bold, flex: 1, textAlign: 'left' },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: space[3] },
  deleteText: { ...text.body, color: colors.missed },
});
