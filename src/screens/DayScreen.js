// יום מסוים (נפתח מהשבוע או מהחודש)
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import ProgressCard from '../components/ProgressCard';
import DayList from '../components/DayList';
import Fab from '../components/Fab';
import { useAppState, useRange } from '../state/AppState';
import { progress } from '../logic/dayItems';
import { formatDayTitle, formatHebDate, diffDays } from '../logic/dates';

function relative(today, key) {
  const n = diffDays(today, key);
  if (n === 0) return 'היום';
  if (n === 1) return 'מחר';
  if (n === -1) return 'אתמול';
  return n > 0 ? `בעוד ${n} ימים` : `לפני ${-n} ימים`;
}

export default function DayScreen({ route, navigation }) {
  const { date } = route.params;
  const { today, openTaskSheet } = useAppState();
  const { byDate, loaded } = useRange(date, date);
  const items = byDate[date] || [];
  const p = progress(items);
  const past = date < today;
  return (
    <View style={styles.root}>
      <Screen
        eyebrow={relative(today, date)}
        title={formatDayTitle(date)}
        subtitle={formatHebDate(date, { year: true })}
        onBack={() => navigation.goBack()}
      >
        {p.total ? <ProgressCard done={p.done} total={p.total} /> : null}
        {loaded ? (
          <DayList
            items={items}
            emptyTitle={past ? 'לא היו משימות ביום הזה' : 'אין משימות ביום הזה'}
            emptySubtitle={past ? '' : 'אפשר להוסיף משימה בכפתור +'}
          />
        ) : null}
      </Screen>
      <Fab bottom={28} onPress={() => openTaskSheet({ date })} />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
