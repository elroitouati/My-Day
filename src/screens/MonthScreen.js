// חודש: לוח שנה עם נקודות צבעוניות לפי קטגוריות. לחיצה על יום פותחת אותו.
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { useAppState, useRange } from '../state/AppState';
import { buildMonthGrid, monthLabel, keyToDate, HEB_WEEKDAYS_LETTER, dayKey } from '../logic/dates';
import { progress } from '../logic/dayItems';
import { colors, radius, shadow, space, text, font, fs } from '../design/tokens';
import { useStyles } from '../state/Theme';
import { motion } from '../design/feedback';

export default function MonthScreen({ navigation }) {
  const styles = useStyles(makeStyles);
  const { today } = useAppState();
  const t = keyToDate(today);
  const [ym, setYm] = useState({ y: t.getFullYear(), m: t.getMonth() });
  const grid = buildMonthGrid(ym.y, ym.m);
  const first = dayKey(new Date(ym.y, ym.m, 1));
  const last = dayKey(new Date(ym.y, ym.m + 1, 0));
  const { byDate } = useRange(first, last);
  const move = (n) => {
    const d = new Date(ym.y, ym.m + n, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  };
  const isCurrent = ym.y === t.getFullYear() && ym.m === t.getMonth();

  return (
    <Screen
      eyebrow="חודש"
      title={monthLabel(ym.y, ym.m)}
      action={
        <View style={styles.nav}>
          <Pressable style={styles.navBtn} onPress={() => move(-1)} accessibilityLabel="החודש הקודם">
            <Ionicons name="chevron-forward" size={20} color={colors.ink} />
          </Pressable>
          {!isCurrent ? (
            <Pressable style={[styles.navBtn, styles.todayBtn]} onPress={() => setYm({ y: t.getFullYear(), m: t.getMonth() })}>
              <Text style={styles.todayText}>היום</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.navBtn} onPress={() => move(1)} accessibilityLabel="החודש הבא">
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </Pressable>
        </View>
      }
    >
      <Animated.View key={`${ym.y}-${ym.m}`} entering={motion(FadeIn.duration(250))} style={styles.card}>
        <View style={styles.week}>
          {HEB_WEEKDAYS_LETTER.map((l) => (
            <Text key={l} style={styles.weekday}>{l}</Text>
          ))}
        </View>
        {grid.map((week, wi) => (
          <View key={wi} style={styles.week}>
            {week.map((k, di) => {
              if (!k) return <View key={di} style={styles.cell} />;
              const items = byDate[k] || [];
              const p = progress(items);
              const dots = [...new Set(items.map((i) => i.color))].slice(0, 4);
              const isToday = k === today;
              const all = p.total > 0 && p.done === p.total;
              const missed = k < today && p.done < p.total;
              return (
                <Pressable
                  key={k}
                  style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
                  onPress={() => navigation.navigate('Day', { date: k })}
                  accessibilityLabel={`${keyToDate(k).getDate()}, ${p.total} משימות`}
                >
                  <View style={[styles.num, isToday && styles.numToday, all && !isToday && styles.numAll]}>
                    <Text style={[styles.numText, isToday && styles.numTextToday, all && !isToday && styles.numTextAll, k < today && !all && styles.numTextPast]}>
                      {keyToDate(k).getDate()}
                    </Text>
                  </View>
                  <View style={styles.dots}>
                    {dots.map((c) => (
                      <View key={c} style={[styles.dot, { backgroundColor: c }]} />
                    ))}
                  </View>
                  {missed ? <View style={styles.missedMark} /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </Animated.View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.numAll]} />
          <Text style={styles.legendText}>הכל הושלם</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendMissed]} />
          <Text style={styles.legendText}>יש פספוס</Text>
        </View>
      </View>
    </Screen>
  );
}

const makeStyles = () => StyleSheet.create({
  nav: { flexDirection: 'row', gap: 6 },
  navBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  todayBtn: { width: undefined, paddingHorizontal: 12 },
  todayText: { fontFamily: font.bold, fontSize: fs(13), color: colors.brand },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: space[2], ...shadow.card },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', ...text.caption, fontFamily: font.bold, paddingVertical: space[2] },
  cell: { flex: 1, height: 62, alignItems: 'center', paddingTop: 4, borderRadius: 14 },
  cellPressed: { backgroundColor: colors.sunken },
  num: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  numToday: { backgroundColor: colors.brand },
  numAll: { backgroundColor: colors.successSoft },
  numText: { fontFamily: font.bold, fontSize: fs(15), color: colors.ink },
  numTextToday: { color: colors.onBrand },
  numTextAll: { color: colors.success },
  numTextPast: { color: colors.ink2 },
  dots: { flexDirection: 'row', gap: 3, marginTop: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  missedMark: { position: 'absolute', top: 6, end: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.missed },
  legend: { flexDirection: 'row', gap: space[4], paddingHorizontal: space[2] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 14, borderRadius: 7 },
  legendMissed: { backgroundColor: colors.missed, width: 8, height: 8, borderRadius: 4 },
  legendText: { ...text.caption },
});
