// רשימת הפריטים של יום אחד: "כל היום" למעלה, ואחריהן לפי שעה.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import TaskCard from './TaskCard';
import EmptyState from './EmptyState';
import { setItemDone } from '../services/actions';
import { useAppState } from '../state/AppState';
import { colors, space, text, font } from '../design/tokens';

export default function DayList({ items, emptyTitle, emptySubtitle }) {
  const { openTaskSheet } = useAppState();
  if (!items.length) return <EmptyState title={emptyTitle} subtitle={emptySubtitle} />;
  const allDay = items.filter((i) => !i.startTime);
  const timed = items.filter((i) => i.startTime);

  const onPress = (item) => {
    if (item.source === 'task') openTaskSheet({ task: item.task, date: item.date });
  };
  const toggle = (item) => (done) => {
    // סימון של המשימה האחרונה שנשארה — רטט "הצלחה"
    if (done && items.every((i) => i.done || i.uid === item.uid)) {
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}), 250);
    }
    setItemDone({ source: item.source, id: item.id, date: item.date }, done).catch((e) => console.warn(e));
  };

  let i = 0;
  const render = (item) => (
    <TaskCard
      key={item.uid}
      item={item}
      index={i++}
      onToggle={toggle(item)}
      onPress={item.source === 'task' ? () => onPress(item) : undefined}
    />
  );

  return (
    <View>
      {allDay.length ? <Text style={styles.section}>כל היום</Text> : null}
      {allDay.map(render)}
      {timed.length ? <Text style={styles.section}>לפי שעה</Text> : null}
      {timed.map(render)}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    ...text.caption,
    fontFamily: font.bold,
    color: colors.ink2,
    marginTop: space[3],
    marginBottom: space[2],
    paddingHorizontal: space[1],
    textAlign: 'left',
  },
});
