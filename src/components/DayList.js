// רשימת הפריטים של יום אחד.
//  סדר אוטומטי: "כל היום" למעלה, ואחריהן לפי שעה.
//  סדר ידני: הסדר שנשמר בגרירה (מצב "סידור").
//  משימות שבוצעו: במקום / בסוף / מוסתרות — לפי ההגדרות.
//  לחיצה ארוכה על משימה: העברה להיום או למחר.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import TaskCard from './TaskCard';
import EmptyState from './EmptyState';
import { setItemDone, afterChange } from '../services/actions';
import { useAppState } from '../state/AppState';
import { getDayOrder, setDayOrder, moveTaskOccurrence } from '../db/repo';
import { arrangeItems } from '../logic/arrange';
import { addDays, formatTimeRange } from '../logic/dates';
import { colors, space, text, font, radius, shadow, fs } from '../design/tokens';
import { useStyles, useTheme } from '../state/Theme';
import { haptic } from '../design/feedback';

export default function DayList({ items, date, reorder, emptyTitle, emptySubtitle }) {
  const styles = useStyles(makeStyles);
  const { openTaskSheet, today, version } = useAppState();
  const { sortMode, doneItems, setTheme } = useTheme();
  const [order, setOrder] = useState(null);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    let alive = true;
    if (date) getDayOrder(date).then((o) => alive && setOrder(o)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [date, version]);

  if (!items.length) return <EmptyState title={emptyTitle} subtitle={emptySubtitle} />;

  const manual = sortMode === 'manual';
  const effectiveDone = doneItems === 'hide' && showDone ? 'bottom' : doneItems;
  const arrange = (list) => arrangeItems(list, { sortMode, order, doneItems: effectiveDone });
  const hiddenCount = doneItems === 'hide' ? items.filter((i) => i.done).length : 0;

  const toggle = (item) => (done) => {
    // סימון של המשימה האחרונה שנשארה — רטט "הצלחה"
    if (done && items.every((i) => i.done || i.uid === item.uid)) setTimeout(() => haptic.success(), 250);
    setItemDone({ source: item.source, id: item.id, date: item.date }, done).catch((e) => console.warn(e));
  };

  const move = async (item, to) => {
    await moveTaskOccurrence(item.task, item.date, to);
    haptic.success();
    await afterChange();
  };

  const longPress = (item) => {
    if (item.source !== 'task') return;
    haptic.medium();
    const tomorrow = addDays(today, 1);
    const buttons = [{ text: 'ביטול', style: 'cancel' }];
    if (item.date !== today) buttons.push({ text: 'העבר להיום', onPress: () => move(item, today) });
    if (item.date !== tomorrow) buttons.push({ text: 'העבר למחר', onPress: () => move(item, tomorrow) });
    Alert.alert(item.title, item.recurring ? 'רק המופע הזה יועבר. שאר המופעים נשארים במקומם.' : 'לאן להעביר את המשימה?', buttons, { cancelable: true });
  };

  // ---- מצב סידור: גרירה ----
  if (reorder) {
    const data = arrangeItems(items, { sortMode: 'manual', order, doneItems: 'inline' });
    return (
      <View>
        <Text style={styles.hint}>גוררים משימה בעזרת הידית כדי לשנות את הסדר</Text>
        <DraggableFlatList
          data={data}
          keyExtractor={(it) => it.uid}
          scrollEnabled={false}
          activationDistance={8}
          onDragBegin={() => haptic.medium()}
          onDragEnd={({ data: next }) => {
            const uids = next.map((it) => it.uid);
            setOrder(uids);
            setDayOrder(date, uids).catch(() => {});
            if (!manual) setTheme({ sortMode: 'manual' });
            afterChange({ widget: true });
          }}
          renderItem={({ item, drag, isActive }) => (
            <ScaleDecorator>
              <Pressable onLongPress={drag} delayLongPress={120} style={[styles.dragRow, isActive && styles.dragRowActive]}>
                <View style={[styles.dragStrip, { backgroundColor: item.color }]} />
                <View style={styles.dragTexts}>
                  <Text style={[styles.dragTitle, item.done && styles.dragDone]} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.dragMeta} numberOfLines={1}>{formatTimeRange(item.startTime, item.endTime)}</Text>
                </View>
                <Pressable onPressIn={drag} hitSlop={10} accessibilityLabel={`גרירת ${item.title}`}>
                  <Ionicons name="reorder-three" size={28} color={colors.ink3} />
                </Pressable>
              </Pressable>
            </ScaleDecorator>
          )}
        />
      </View>
    );
  }

  let i = 0;
  const render = (item) => (
    <TaskCard
      key={item.uid}
      item={item}
      index={i++}
      onToggle={toggle(item)}
      onPress={item.source === 'task' ? () => openTaskSheet({ task: item.task, date: item.date }) : undefined}
      onLongPress={item.source === 'task' ? () => longPress(item) : undefined}
    />
  );

  const doneToggle = hiddenCount ? (
    <Pressable onPress={() => setShowDone((v) => !v)} style={styles.doneToggle} accessibilityRole="button">
      <Ionicons name={showDone ? 'eye-off-outline' : 'checkmark-done'} size={16} color={colors.brand} />
      <Text style={styles.doneToggleText}>{showDone ? 'הסתרת המשימות שהושלמו' : `הצגת ${hiddenCount} שהושלמו`}</Text>
    </Pressable>
  ) : null;

  if (manual) {
    return (
      <View>
        {arrange(items).map(render)}
        {doneToggle}
      </View>
    );
  }

  const allDay = arrange(items.filter((x) => !x.startTime));
  const timed = arrange(items.filter((x) => x.startTime));
  return (
    <View>
      {allDay.length ? <Text style={styles.section}>כל היום</Text> : null}
      {allDay.map(render)}
      {timed.length ? <Text style={styles.section}>לפי שעה</Text> : null}
      {timed.map(render)}
      {doneToggle}
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  section: {
    ...text.caption,
    fontFamily: font.bold,
    color: colors.ink2,
    marginTop: space[3],
    marginBottom: space[2],
    paddingHorizontal: space[1],
    textAlign: 'left',
  },
  hint: { ...text.caption, textAlign: 'left', marginBottom: space[2], paddingHorizontal: space[1] },
  dragRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: space[3],
    paddingHorizontal: space[3],
    marginBottom: space[2],
    ...shadow.card,
  },
  dragRowActive: { backgroundColor: colors.brandSoft, elevation: 8 },
  dragStrip: { width: 5, alignSelf: 'stretch', borderRadius: 3 },
  dragTexts: { flex: 1, minWidth: 0 },
  dragTitle: { ...text.body, fontFamily: font.bold, textAlign: 'left' },
  dragDone: { color: colors.ink3, textDecorationLine: 'line-through' },
  dragMeta: { ...text.caption, textAlign: 'left' },
  doneToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: space[3] },
  doneToggleText: { fontFamily: font.bold, fontSize: fs(14), color: colors.brand },
});
