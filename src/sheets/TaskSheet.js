// גיליון הוספה ועריכה של משימה.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../components/BottomSheet';
import { Button, Chips, DayToggles, Field, Label, Stepper, Group, Row, Toggle } from '../components/controls';
import { pickDate, pickTime } from '../components/pickers';
import { useAppState } from '../state/AppState';
import { createTask, editTask, removeTask, saveCategory, getTaskHistory, forgetTask } from '../db/repo';
import { rankSuggestions, highlightParts } from '../logic/suggest';
import ColorPicker from '../components/ColorPicker';
import { afterChange } from '../services/actions';
import { REMINDER_OPTIONS } from '../services/notifications';
import { parseRule, validateRule } from '../logic/recurrence';
import { newId } from '../logic/editing';
import { formatHebDate, weekday, keyToDate, timeToMinutes, minutesToTime, todayKey, formatTimeRange, timeModeOf, timesFor, END_OF_DAY } from '../logic/dates';
import { PALETTE, IMPORTANT_RED, colors, space, text, font, shadow, tint } from '../design/tokens';
import { useStyles, useTheme } from '../state/Theme';
import { haptic, motion } from '../design/feedback';

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
      color: null, // צבע משלה (null = לפי הקטגוריה)
      notes: '',
      timeMode: 'allday',
      start_time: '09:00',
      end_time: '10:00',
      reminder: settings?.defaultReminder ?? 10,
      important: false,
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
    color: task.color || null,
    notes: task.notes || '',
    timeMode: timeModeOf(task.start_time, task.end_time),
    start_time: task.start_time || '09:00',
    end_time: task.end_time && task.end_time !== END_OF_DAY ? task.end_time : '',
    reminder: task.reminder ?? null,
    important: !!task.important,
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
    color: d.color || null,
    notes: d.notes.trim() || null,
    ...timesFor(d.timeMode, d.start_time, d.end_time),
    reminder: d.timeMode !== 'allday' ? d.reminder : null,
    important: !!d.important,
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
  const impColor = useTheme().importantColor || IMPORTANT_RED;
  const { task, date } = sheet;
  const [d, setD] = useState(() => initialDraft(task, date, settings, categories));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  const [newCat, setNewCat] = useState(null);
  // השלמה אוטומטית: משימות שכבר הקלדת בעבר
  const [history, setHistory] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(!task);
  const loadHistory = useCallback(
    () =>
      getTaskHistory()
        .then(setHistory)
        .catch(() => {}),
    []
  );
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);
  const suggestions = useMemo(() => (task ? [] : rankSuggestions(history, d.title)), [history, d.title, task]);
  const catColor = d.category_id ? categories.find((c) => c.id === d.category_id)?.color : null;
  const applySuggestion = (h) => {
    haptic.tap();
    const catExists = h.category_id && categories.some((c) => c.id === h.category_id);
    set({
      title: h.title,
      category_id: catExists ? h.category_id : null,
      color: h.color || null,
      timeMode: timeModeOf(h.start_time, h.end_time),
      start_time: h.start_time || d.start_time,
      end_time: h.end_time && h.end_time !== END_OF_DAY ? h.end_time : '',
      reminder: h.start_time || h.end_time ? (h.reminder ?? null) : d.reminder,
    });
    setSuggestOpen(false);
  }; // { name, color } כשיוצרים קטגוריה מתוך הגיליון
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

  const chooseTimeMode = (m) => {
    // "עד" בלי שעה שנבחרה — ברירת מחדל 18:00
    set(m === 'until' && !d.end_time ? { timeMode: m, end_time: '18:00' } : { timeMode: m });
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
      haptic.success();
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
          setSuggestOpen(true);
        }}
        placeholder="מה צריך לעשות?"
        autoFocus={!task}
        returnKeyType="done"
        onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
        onFocus={() => setSuggestOpen(true)}
      />
      {suggestOpen && suggestions.length ? (
        <Animated.View entering={motion(FadeIn.duration(150))} style={styles.suggest}>
          {suggestions.map((h, idx) => {
            const cat = h.category_id ? categories.find((c) => c.id === h.category_id) : null;
            const dot = h.color || cat?.color || null;
            return (
              <Pressable
                key={h.title}
                onPress={() => applySuggestion(h)}
                onLongPress={() =>
                  Alert.alert('להסיר מההצעות?', h.title, [
                    { text: 'ביטול', style: 'cancel' },
                    { text: 'הסרה', style: 'destructive', onPress: () => forgetTask(h.title).then(loadHistory) },
                  ])
                }
                style={({ pressed }) => [styles.suggestRow, idx > 0 && styles.suggestSep, pressed && styles.suggestPressed]}
                accessibilityRole="button"
                accessibilityLabel={`הצעה: ${h.title}`}
              >
                <View style={[styles.suggestBar, { backgroundColor: dot || colors.line }]} />
                <View style={styles.suggestTexts}>
                  <Text style={styles.suggestTitle} numberOfLines={1}>
                    {highlightParts(h.title, d.title).map((part, i) => (
                      <Text key={i} style={part.hit ? styles.suggestHit : null}>
                        {part.text}
                      </Text>
                    ))}
                  </Text>
                  <Text style={styles.suggestMeta} numberOfLines={1}>
                    {[formatTimeRange(h.start_time, h.end_time), cat?.name].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Ionicons name="arrow-undo-outline" size={18} color={colors.ink3} />
              </Pressable>
            );
          })}
        </Animated.View>
      ) : null}

      <Pressable
        onPress={() => {
          haptic.light();
          set({ important: !d.important });
        }}
        style={[styles.importantRow, d.important && { backgroundColor: tint(impColor, 0.1), borderColor: impColor }]}
        accessibilityRole="switch"
        accessibilityState={{ checked: d.important }}
      >
        <Ionicons name={d.important ? 'star' : 'star-outline'} size={22} color={d.important ? impColor : colors.ink3} />
        <View style={styles.importantTexts}>
          <Text style={styles.importantTitle}>משימה חשובה</Text>
          <Text style={styles.importantSub}>{d.important ? 'תופיע למעלה ומודגשת' : 'להבליט ולהציג בראש הרשימה'}</Text>
        </View>
        <Toggle value={d.important} onValueChange={(v) => set({ important: v })} />
      </Pressable>

      <Label>קטגוריה</Label>
      <Chips options={catOptions} value={newCat ? NEW_CATEGORY : d.category_id} onChange={chooseCategory} colorFor={(o) => o.color} />
      {newCat ? (
        <Animated.View entering={motion(FadeIn)} exiting={motion(FadeOut)} style={styles.newCat}>
          <Field value={newCat.name} onChangeText={(name) => setNewCat((c) => ({ ...c, name }))} placeholder="שם הקטגוריה, למשל: עבודה" autoFocus />
          <ColorPicker value={newCat.color} onChange={(color) => setNewCat((c) => ({ ...c, color }))} />
          <Button title="יצירת הקטגוריה" kind="soft" icon="add" onPress={createCategory} disabled={!newCat.name.trim()} />
        </Animated.View>
      ) : null}

      <Label>צבע המשימה</Label>
      <Chips
        options={[
          { value: 'cat', label: d.category_id ? 'כמו הקטגוריה' : 'בלי צבע' },
          { value: 'own', label: 'צבע משלה' },
        ]}
        value={d.color ? 'own' : 'cat'}
        onChange={(v) => set({ color: v === 'own' ? d.color || catColor || PALETTE[5] : null })}
      />
      {d.color ? <ColorPicker value={d.color} onChange={(c) => set({ color: c })} allowNone={false} /> : null}

      <Label>חזרה</Label>
      <Chips options={REPEAT} value={d.repeat} onChange={(v) => set({ repeat: v })} />

      <Animated.View layout={motion(LinearTransition)} style={styles.block}>
        {d.repeat === 'weekly' ? (
          <Animated.View entering={motion(FadeIn)} exiting={motion(FadeOut)}>
            <DayToggles value={d.days} onChange={(days) => set({ days })} />
          </Animated.View>
        ) : null}
        {d.repeat === 'interval' ? (
          <Animated.View entering={motion(FadeIn)} exiting={motion(FadeOut)} style={styles.inline}>
            <Text style={styles.inlineText}>כל</Text>
            <Stepper value={d.every} onChange={(every) => set({ every })} min={1} max={365} suffix="ימים" />
          </Animated.View>
        ) : null}
        {d.repeat === 'monthly' ? (
          <Animated.View entering={motion(FadeIn)} exiting={motion(FadeOut)} style={styles.inline}>
            <Text style={styles.inlineText}>בכל חודש ביום</Text>
            <Stepper value={d.monthDay} onChange={(monthDay) => set({ monthDay })} min={1} max={31} />
          </Animated.View>
        ) : null}
        {d.repeat === 'monthly' && d.monthDay > 28 ? (
          <Text style={styles.hint}>בחודש שאין בו יום {d.monthDay} — המשימה תופיע ביום האחרון של החודש.</Text>
        ) : null}

        <Group>
          {recurring ? (
            <Row
              icon="play-outline"
              title="מתחילה ב-"
              value={formatHebDate(d.start_date, { year: true })}
              onPress={() => pickDate(d.start_date, (k) => set({ start_date: k }))}
            />
          ) : (
            <Row
              icon="calendar-outline"
              title="תאריך"
              value={formatHebDate(d.date, { year: true })}
              onPress={() => pickDate(d.date, (k) => set({ date: k }))}
            />
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
          <View style={styles.timeModes}>
            <View style={styles.timeHead}>
              <Ionicons name="time-outline" size={18} color={colors.brand} />
              <Text style={styles.timeTitle}>שעה</Text>
            </View>
            <Chips options={TIME_MODES} value={d.timeMode} onChange={chooseTimeMode} />
          </View>
          {d.timeMode === 'range' ? <Row title="התחלה" value={d.start_time} onPress={() => pickTime(d.start_time, setStart)} /> : null}
          {d.timeMode === 'range' ? (
            <Row title="סיום" value={d.end_time || 'ללא'} onPress={() => pickTime(d.end_time || d.start_time, (t) => set({ end_time: t }))} />
          ) : null}
          {d.timeMode === 'from' ? (
            <Row title="החל מהשעה" subtitle="ועד סוף היום" value={d.start_time} onPress={() => pickTime(d.start_time, (t) => set({ start_time: t }))} />
          ) : null}
          {d.timeMode === 'until' ? (
            <Row
              title="עד השעה"
              subtitle="אפשר לעשות מתי שרוצים עד אז"
              value={d.end_time || '18:00'}
              onPress={() => pickTime(d.end_time || '18:00', (t) => set({ end_time: t }))}
            />
          ) : null}
        </Group>

        {d.timeMode !== 'allday' ? (
          <>
            <Label>{d.timeMode === 'until' ? 'תזכורת לפני השעה' : 'תזכורת לפני'}</Label>
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

const TIME_MODES = [
  { value: 'allday', label: 'כל היום' },
  { value: 'range', label: 'בשעה' },
  { value: 'from', label: 'החל מ…' },
  { value: 'until', label: 'עד…' },
];

const makeStyles = () =>
  StyleSheet.create({
    timeModes: { paddingHorizontal: space[3], paddingVertical: space[3], gap: space[2] },
    timeHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    timeTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink, textAlign: 'left' },
    importantRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      backgroundColor: colors.sunken,
      borderRadius: 18,
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      marginTop: space[3],
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    importantTexts: { flex: 1 },
    importantTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink, textAlign: 'left' },
    importantSub: { ...text.caption, color: colors.ink2, textAlign: 'left' },
    importantHint: { ...text.sub, textAlign: 'left' },
    form: { gap: space[4] },
    block: { gap: space[4] },
    suggest: { backgroundColor: colors.card, borderRadius: 20, marginTop: -space[2], overflow: 'hidden', ...shadow.card },
    suggestRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
    suggestSep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
    suggestPressed: { backgroundColor: colors.sunken },
    suggestBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
    suggestTexts: { flex: 1, minWidth: 0 },
    suggestTitle: { ...text.body, fontFamily: font.bold, textAlign: 'left' },
    suggestHit: { color: colors.brand },
    suggestMeta: { ...text.caption, textAlign: 'left' },
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
