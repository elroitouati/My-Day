import React from 'react';
import Screen from '../components/Screen';
import ProgressCard from '../components/ProgressCard';
import DayList from '../components/DayList';
import { useAppState, useRange } from '../state/AppState';
import { progress } from '../logic/dayItems';
import { formatDayTitle, formatHebDate } from '../logic/dates';
import { fullRefresh } from '../services/refresh';

export default function TodayScreen() {
  const { today } = useAppState();
  const { byDate, loaded } = useRange(today, today);
  const items = byDate[today] || [];
  const p = progress(items);
  return (
    <Screen eyebrow="היום" title={formatDayTitle(today)} subtitle={formatHebDate(today, { year: true })} onRefresh={fullRefresh}>
      {p.total ? <ProgressCard done={p.done} total={p.total} /> : null}
      {loaded ? <DayList items={items} /> : null}
    </Screen>
  );
}
