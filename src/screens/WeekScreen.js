// שבוע: ציר זמן של 7 ימים עם בלוקים צבעוניים למשימות עם שעה,
// ומעל כל יום — כמה הושלם ממנו.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppState, useRange } from '../state/AppState';
import { useFocusKey } from '../components/Screen';
import { addDays, startOfWeek, rangeKeys, keyToDate, HEB_WEEKDAYS_LETTER, HEB_MONTHS, timeToMinutes } from '../logic/dates';
import { progress } from '../logic/dayItems';
import { colors, radius, shadow, space, text, font, tint, fs } from '../design/tokens';
import { useStyles } from '../state/Theme';
import { motion } from '../design/feedback';

const HOUR = 52;
const HOURS_COL = 34;

function weekLabel(start) {
  const a = keyToDate(start);
  const b = keyToDate(addDays(start, 6));
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ב${HEB_MONTHS[a.getMonth()]}`;
  return `${a.getDate()} ב${HEB_MONTHS[a.getMonth()]} – ${b.getDate()} ב${HEB_MONTHS[b.getMonth()]}`;
}

// חלוקה לנתיבים כשבלוקים חופפים
function layoutBlocks(items) {
  const blocks = items
    .map((it) => {
      const s = timeToMinutes(it.startTime);
      const e = Math.max(s + 30, timeToMinutes(it.endTime) ?? s + 30);
      return { it, s, e };
    })
    .sort((a, b) => a.s - b.s || b.e - a.e);
  const out = [];
  let cluster = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = [];
    cluster.forEach((b) => {
      let lane = lanes.findIndex((end) => end <= b.s);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(b.e);
      } else lanes[lane] = b.e;
      b.lane = lane;
    });
    cluster.forEach((b) => out.push({ ...b, lanes: lanes.length }));
    cluster = [];
  };
  blocks.forEach((b) => {
    if (b.s >= clusterEnd && cluster.length) flush();
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, b.e);
  });
  if (cluster.length) flush();
  return out;
}

export default function WeekScreen({ navigation }) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const focusKey = useFocusKey();
  const { today, openTaskSheet } = useAppState();
  const [start, setStart] = useState(() => startOfWeek(today));
  const end = addDays(start, 6);
  const days = rangeKeys(start, end);
  const { byDate } = useRange(start, end);

  const { fromHour, toHour } = useMemo(() => {
    let min = 7 * 60;
    let max = 22 * 60;
    days.forEach((k) =>
      (byDate[k] || []).forEach((i) => {
        if (!i.startTime) return;
        min = Math.min(min, timeToMinutes(i.startTime));
        max = Math.max(max, timeToMinutes(i.endTime) ?? timeToMinutes(i.startTime) + 30);
      })
    );
    return { fromHour: Math.floor(min / 60), toHour: Math.min(24, Math.ceil(max / 60)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byDate, start]);

  const hours = [];
  for (let h = fromHour; h < toHour; h++) hours.push(h);
  const openDay = (date) => navigation.navigate('Day', { date });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Animated.View key={focusKey} entering={motion(FadeIn.duration(220))} style={styles.root}>
        <View style={styles.header}>
          <View style={styles.headerTexts}>
            <Text style={styles.eyebrow}>שבוע</Text>
            <Text style={styles.title}>{weekLabel(start)}</Text>
          </View>
          <View style={styles.nav}>
            <Pressable style={styles.navBtn} onPress={() => setStart(addDays(start, -7))} accessibilityLabel="השבוע הקודם">
              <Ionicons name="chevron-forward" size={20} color={colors.ink} />
            </Pressable>
            <Pressable style={[styles.navBtn, styles.todayBtn]} onPress={() => setStart(startOfWeek(today))} accessibilityLabel="השבוע">
              <Text style={styles.todayText}>היום</Text>
            </Pressable>
            <Pressable style={styles.navBtn} onPress={() => setStart(addDays(start, 7))} accessibilityLabel="השבוע הבא">
              <Ionicons name="chevron-back" size={20} color={colors.ink} />
            </Pressable>
          </View>
        </View>

        {/* כותרות הימים + כמה הושלם */}
        <View style={styles.daysRow}>
          <View style={{ width: HOURS_COL }} />
          {days.map((k) => {
            const items = byDate[k] || [];
            const p = progress(items);
            const isToday = k === today;
            const all = p.total > 0 && p.done === p.total;
            const missed = items.some((i) => i.missed); // רק פנמ"צ
            return (
              <Pressable key={k} style={styles.dayHead} onPress={() => openDay(k)} accessibilityLabel={`פתיחת יום ${k}`}>
                <Text style={[styles.dayLetter, isToday && styles.brandText]}>{HEB_WEEKDAYS_LETTER[keyToDate(k).getDay()]}</Text>
                <View style={[styles.dayNum, isToday && styles.dayNumToday]}>
                  <Text style={[styles.dayNumText, isToday && styles.dayNumTextToday]}>{keyToDate(k).getDate()}</Text>
                </View>
                <View style={[styles.count, all && styles.countAll, missed && styles.countMissed, !p.total && styles.countEmpty]}>
                  <Text style={[styles.countText, all && styles.countTextAll, missed && styles.countTextMissed]}>
                    {p.total ? `${p.done}/${p.total}` : '–'}
                  </Text>
                </View>
                {/* משימות "כל היום" — פסים קטנים */}
                <View style={styles.allDay}>
                  {items
                    .filter((i) => !i.startTime)
                    .slice(0, 3)
                    .map((i) => (
                      <View key={i.uid} style={[styles.allDayBar, { backgroundColor: i.done ? tint(i.color, 0.35) : i.color }]} />
                    ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.timelineContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.timeline, { height: hours.length * HOUR }]}>
            <View style={{ width: HOURS_COL }}>
              {hours.map((h) => (
                <Text key={h} style={[styles.hour, { top: (h - fromHour) * HOUR - 7 }]}>{String(h).padStart(2, '0')}</Text>
              ))}
            </View>
            {days.map((k) => {
              const blocks = layoutBlocks((byDate[k] || []).filter((i) => i.startTime));
              return (
                <Pressable key={k} style={[styles.col, k === today && styles.colToday]} onPress={() => openDay(k)}>
                  {hours.map((h) => (
                    <View key={h} style={[styles.hourLine, { top: (h - fromHour) * HOUR }]} />
                  ))}
                  {blocks.map((b) => {
                    const top = ((b.s - fromHour * 60) / 60) * HOUR;
                    const height = Math.max(24, ((b.e - b.s) / 60) * HOUR - 2);
                    const widthPct = 100 / b.lanes;
                    return (
                      <Pressable
                        key={b.it.uid}
                        onPress={() => (b.it.source === 'task' ? openTaskSheet({ task: b.it.task, date: k }) : openDay(k))}
                        style={[
                          styles.block,
                          {
                            top,
                            height,
                            width: `${widthPct}%`,
                            start: `${widthPct * b.lane}%`,
                            backgroundColor: tint(b.it.color, b.it.done ? 0.12 : 0.2),
                            borderStartColor: b.it.color,
                          },
                          b.it.missed && styles.blockMissed,
                        ]}
                        accessibilityLabel={`${b.it.title} ${b.it.startTime}`}
                      >
                        <Text style={[styles.blockText, b.it.done && styles.blockTextDone]} numberOfLines={Math.max(1, Math.floor(height / 14))}>
                          {b.it.done ? '✓ ' : ''}
                          {b.it.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], paddingTop: space[4], paddingBottom: space[3], gap: space[3] },
  headerTexts: { flex: 1 },
  eyebrow: { ...text.caption, color: colors.brand, fontFamily: font.bold, textAlign: 'left' },
  title: { ...text.title, textAlign: 'left' },
  nav: { flexDirection: 'row', gap: 6 },
  navBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  todayBtn: { width: undefined, paddingHorizontal: 12 },
  todayText: { fontFamily: font.bold, fontSize: fs(13), color: colors.brand },
  daysRow: {
    flexDirection: 'row',
    marginHorizontal: space[2],
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingVertical: space[2],
    ...shadow.card,
  },
  dayHead: { flex: 1, alignItems: 'center', gap: 3 },
  dayLetter: { ...text.caption, fontFamily: font.bold },
  brandText: { color: colors.brand },
  dayNum: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayNumToday: { backgroundColor: colors.brand },
  dayNumText: { fontFamily: font.bold, fontSize: fs(15), color: colors.ink },
  dayNumTextToday: { color: colors.onBrand },
  count: { paddingHorizontal: 6, height: 18, borderRadius: 9, backgroundColor: colors.brandSoft, justifyContent: 'center' },
  countAll: { backgroundColor: colors.successSoft },
  countMissed: { backgroundColor: colors.missedSoft },
  countEmpty: { backgroundColor: 'transparent' },
  countText: { fontFamily: font.bold, fontSize: fs(11), color: colors.brand },
  countTextAll: { color: colors.success },
  countTextMissed: { color: colors.missed },
  allDay: { gap: 2, alignSelf: 'stretch', paddingHorizontal: 5, minHeight: 6 },
  allDayBar: { height: 4, borderRadius: 2 },
  timelineContent: { paddingHorizontal: space[2], paddingTop: space[4], paddingBottom: 140 },
  timeline: { flexDirection: 'row' },
  hour: { position: 'absolute', end: 6, fontFamily: font.medium, fontSize: fs(11), color: colors.ink3 },
  col: { flex: 1, borderStartWidth: StyleSheet.hairlineWidth, borderStartColor: colors.line },
  colToday: { backgroundColor: tint(colors.brand, 0.04) },
  hourLine: { position: 'absolute', start: 0, end: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  block: { position: 'absolute', borderRadius: 8, borderStartWidth: 3, paddingHorizontal: 3, paddingVertical: 2, overflow: 'hidden' },
  blockMissed: { borderStartColor: colors.missed },
  blockText: { fontFamily: font.bold, fontSize: fs(10), lineHeight: fs(13), color: colors.ink, textAlign: 'left' },
  blockTextDone: { color: colors.ink3, textDecorationLine: 'line-through' },
});
