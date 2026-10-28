// חודש: לוח בסגנון יומן — בכל יום רואים בקצרה מה יש בו. לחיצה על יום פותחת אותו.
import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import { useAppState, useRange } from "../state/AppState";
import {
  buildMonthGrid,
  monthLabel,
  keyToDate,
  HEB_WEEKDAYS_LETTER,
  dayKey,
} from "../logic/dates";
import { progress } from "../logic/dayItems";
import { monthChips } from "../logic/monthChips";
import {
  colors,
  radius,
  shadow,
  space,
  text,
  font,
  fs,
  onColor,
} from "../design/tokens";
import { useStyles } from "../state/Theme";
import { motion } from "../design/feedback";

const CHIP_H = 17; // גובה שורת צ'יפ
const HEAD_H = 28; // מספר היום

export default function MonthScreen({ navigation }) {
  const styles = useStyles(makeStyles);
  const { height } = useWindowDimensions();
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
  // הלוח ממלא את המסך: גובה התא נגזר מגובה המסך ומספר השבועות
  const cellH = Math.max(86, Math.floor((height - 330) / grid.length));
  const capacity = Math.max(2, Math.floor((cellH - HEAD_H - 4) / (CHIP_H + 2)));

  return (
    <Screen
      eyebrow="חודש"
      title={monthLabel(ym.y, ym.m)}
      bottomPad={110}
      action={
        <View style={styles.nav}>
          <Pressable
            style={styles.navBtn}
            onPress={() => move(-1)}
            accessibilityLabel="החודש הקודם"
          >
            <Ionicons name="chevron-forward" size={20} color={colors.ink} />
          </Pressable>
          {!isCurrent ? (
            <Pressable
              style={[styles.navBtn, styles.todayBtn]}
              onPress={() => setYm({ y: t.getFullYear(), m: t.getMonth() })}
            >
              <Text style={styles.todayText}>היום</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={styles.navBtn}
            onPress={() => move(1)}
            accessibilityLabel="החודש הבא"
          >
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </Pressable>
        </View>
      }
    >
      <Animated.View
        key={`${ym.y}-${ym.m}`}
        entering={motion(FadeIn.duration(250))}
        style={styles.card}
      >
        <View style={styles.week}>
          {HEB_WEEKDAYS_LETTER.map((l, i) => (
            <Text
              key={l}
              style={[styles.weekday, i === 6 && styles.weekdayShabbat]}
            >
              {l}
            </Text>
          ))}
        </View>
        {grid.map((week, wi) => (
          <View key={wi} style={[styles.week, wi > 0 && styles.weekLine]}>
            {week.map((k, di) => {
              if (!k)
                return (
                  <View key={di} style={[styles.cell, { height: cellH }]} />
                );
              const items = byDate[k] || [];
              const p = progress(items);
              const { chips, more } = monthChips(items, capacity);
              const isToday = k === today;
              const past = k < today;
              const all = p.total > 0 && p.done === p.total;
              return (
                <Pressable
                  key={k}
                  style={({ pressed }) => [
                    styles.cell,
                    { height: cellH },
                    di === 6 && styles.cellShabbat,
                    all && styles.cellAll,
                    isToday && styles.cellToday,
                    pressed && styles.cellPressed,
                  ]}
                  onPress={() => navigation.navigate("Day", { date: k })}
                  accessibilityLabel={`${keyToDate(k).getDate()}, ${p.total} משימות`}
                >
                  <View style={styles.head}>
                    <View style={[styles.num, isToday && styles.numToday]}>
                      <Text
                        style={[
                          styles.numText,
                          isToday && styles.numTextToday,
                          past && !isToday && styles.numTextPast,
                        ]}
                      >
                        {keyToDate(k).getDate()}
                      </Text>
                    </View>
                    {all ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={13}
                        color={colors.success}
                      />
                    ) : null}
                  </View>
                  {chips.map((c) =>
                    c.kind === "fill" ? (
                      <View
                        key={c.key}
                        style={[
                          styles.chip,
                          styles.chipFill,
                          { backgroundColor: c.color },
                          c.done && styles.chipDone,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            styles.chipFillText,
                            { color: onColor(c.color) },
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="clip"
                        >
                          {c.title}
                        </Text>
                      </View>
                    ) : (
                      <View
                        key={c.key}
                        style={[
                          styles.chip,
                          c.missed && styles.chipMissed,
                          c.done && styles.chipDone,
                        ]}
                      >
                        <View
                          style={[
                            styles.chipBar,
                            {
                              backgroundColor: c.missed
                                ? colors.missed
                                : c.color,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.chipText,
                            c.done && styles.chipTextDone,
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="clip"
                        >
                          {c.title}
                        </Text>
                      </View>
                    ),
                  )}
                  {more ? <Text style={styles.more}>+{more}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </Animated.View>
    </Screen>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    nav: { flexDirection: "row", gap: 6 },
    navBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      ...shadow.card,
    },
    todayBtn: { width: undefined, paddingHorizontal: 12 },
    todayText: { fontFamily: font.bold, fontSize: fs(13), color: colors.brand },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.card,
      paddingHorizontal: 4,
      paddingBottom: 4,
      overflow: "hidden",
      ...shadow.card,
    },
    week: { flexDirection: "row" },
    weekLine: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    weekday: {
      flex: 1,
      textAlign: "center",
      ...text.caption,
      fontFamily: font.bold,
      paddingVertical: space[2],
    },
    weekdayShabbat: { color: colors.brand },
    cell: {
      flex: 1,
      paddingHorizontal: 2,
      paddingTop: 3,
      borderRadius: 10,
      overflow: "hidden",
    },
    cellShabbat: { backgroundColor: colors.sunken },
    cellAll: { backgroundColor: colors.successSoft },
    cellToday: { borderWidth: 1.5, borderColor: colors.brand },
    cellPressed: { opacity: 0.6 },
    head: {
      height: HEAD_H,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 1,
    },
    num: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
    },
    numToday: { backgroundColor: colors.brand },
    numText: { fontFamily: font.bold, fontSize: fs(13), color: colors.ink },
    numTextToday: { color: colors.onBrand },
    numTextPast: { color: colors.ink3 },
    chip: {
      height: CHIP_H,
      marginBottom: 2,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 4,
      overflow: "hidden",
    },
    chipFill: { paddingHorizontal: 3 },
    chipBar: { width: 3, alignSelf: "stretch", borderRadius: 2, marginEnd: 2 },
    chipMissed: { backgroundColor: colors.missedSoft },
    chipDone: { opacity: 0.45 },
    chipText: {
      flex: 1,
      fontFamily: font.medium,
      fontSize: fs(10.5),
      lineHeight: CHIP_H - 1,
      color: colors.ink,
      textAlign: "left",
    },
    chipFillText: { fontFamily: font.bold },
    chipTextDone: { textDecorationLine: "line-through" },
    more: {
      fontFamily: font.bold,
      fontSize: fs(10),
      color: colors.ink2,
      paddingHorizontal: 2,
    },
  });
