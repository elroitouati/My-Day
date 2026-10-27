import React, { useState } from 'react';
import Screen from '../components/Screen';
import ProgressCard from '../components/ProgressCard';
import DayList from '../components/DayList';
import { HeaderButton } from '../components/controls';
import { useAppState, useRange } from '../state/AppState';
import { progress } from '../logic/dayItems';
import { formatDayTitle, formatHebDate } from '../logic/dates';
import { fullRefresh } from '../services/refresh';

export default function TodayScreen() {
  const { today } = useAppState();
  const { byDate, loaded } = useRange(today, today);
  const items = byDate[today] || [];
  const p = progress(items);
  const [reorder, setReorder] = useState(false);
  return (
    <Screen eyebrow="היום" title={formatDayTitle(today)} subtitle={formatHebDate(today, { year: true })} onRefresh={fullRefresh}
      action={items.length > 1 ? <HeaderButton icon={reorder ? 'checkmark' : 'swap-vertical'} label={reorder ? 'סיום' : 'סידור'} active={reorder} onPress={() => setReorder((r) => !r)} /> : null}
    >
      {p.total ? <ProgressCard done={p.done} total={p.total} /> : null}
      {loaded ? <DayList items={items} date={today} reorder={reorder} /> : null}
    </Screen>
  );
}
