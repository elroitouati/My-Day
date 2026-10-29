// כרטיס משימה: פס צבע הקטגוריה, כותרת, שעה וקטגוריה, ועיגול V גדול.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import CheckCircle from './CheckCircle';
import { colors, radius, shadow, space, text, tint, fs, font, layout, onColor, mix, IMPORTANT_RED } from '../design/tokens';
import { formatTimeRange } from '../logic/dates';
import { useStyles, useTheme } from '../state/Theme';
import { motion } from '../design/feedback';

const SOURCE_ICON = { calendar: 'calendar-outline', panmatz: 'barbell-outline' };

// משימה חשובה (שעוד לא בוצעה) — בצבע החשיבות (אדום כברירת מחדל), באחד משלושה סגנונות:
//  outline — רקע עדין בצבע + מסגרת דקה + תווית מלאה
//  soft    — כרטיס רגיל, פס צד ותווית רכה בצבע
//  solid   — כרטיס מלא בצבע
export const IMPORTANT_STYLES = [
  { id: 'outline', name: 'מסגרת' },
  { id: 'soft', name: 'עדין' },
  { id: 'solid', name: 'מלא' },
];
const LEGACY = { glow: 'outline', badge: 'soft', bold: 'solid' };

export default function TaskCard({ item, index = 0, onToggle, onPress, onLongPress, importantStyle, importantColor }) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const missed = item.missed;
  const rawStyle = importantStyle || theme.importantStyle || 'outline';
  const imp = item.important && !item.done ? LEGACY[rawStyle] || rawStyle : null;
  const c = importantColor || theme.importantColor || IMPORTANT_RED;
  const solid = imp === 'solid';
  const ink = solid ? onColor(c) : null;
  const accent = imp ? c : item.color; // בחשובה — פס הצד והעיגול בצבע החשיבות
  const meta = [formatTimeRange(item.startTime, item.endTime), item.categoryName].filter(Boolean).join(' · ');
  return (
    <Animated.View entering={motion(FadeInDown.delay(Math.min(index, 8) * 35).duration(260))} layout={motion(LinearTransition.springify().damping(18))}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        style={({ pressed }) => [
          styles.card,
          missed && styles.cardMissed,
          imp === 'outline' && { backgroundColor: mix(colors.card, c, colors.mode === 'dark' ? 0.14 : 0.06), borderWidth: 1.5, borderColor: c },
          solid && { backgroundColor: c },
          pressed && onPress && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${imp ? 'חשוב: ' : ''}${item.title}, ${meta}${item.done ? ', הושלם' : missed ? ', פספוס' : ''}`}
      >
        {solid ? null : <View style={[styles.strip, { backgroundColor: accent }]} />}
        <View style={styles.body}>
          {imp ? (
            <View
              style={[
                styles.pill,
                imp === 'outline' && { backgroundColor: c },
                imp === 'soft' && { backgroundColor: mix(colors.card, c, colors.mode === 'dark' ? 0.24 : 0.14) },
                solid && { backgroundColor: mix(c, ink, 0.22) },
              ]}
            >
              <Ionicons name="star" size={11} color={imp === 'soft' ? c : imp === 'outline' ? onColor(c) : ink} />
              <Text
                style={[
                  styles.pillText,
                  { color: imp === 'soft' ? (colors.mode === 'dark' ? c : mix(c, '#000000', 0.2)) : imp === 'outline' ? onColor(c) : ink },
                ]}
              >
                חשוב
              </Text>
            </View>
          ) : null}
          <Text style={[styles.title, item.done && styles.titleDone, solid && { color: ink }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            {SOURCE_ICON[item.source] ? <Ionicons name={SOURCE_ICON[item.source]} size={13} color={solid ? ink : colors.ink3} style={styles.metaIcon} /> : null}
            {item.recurring ? <Ionicons name="repeat" size={13} color={solid ? ink : colors.ink3} style={styles.metaIcon} /> : null}
            <Text style={[styles.meta, solid && { color: ink, opacity: 0.85 }]} numberOfLines={1}>
              {meta}
            </Text>
          </View>
          {item.subtitle ? (
            <Text style={styles.sub} numberOfLines={1}>
              {item.subtitle}
            </Text>
          ) : null}
          {missed ? (
            <View style={styles.missedPill}>
              <Ionicons name="alert-circle" size={13} color={colors.missed} />
              <Text style={styles.missedText}>פספוס</Text>
            </View>
          ) : item.unmarked ? (
            <View style={styles.missedPill}>
              <Ionicons name="ellipse-outline" size={12} color={colors.ink3} />
              <Text style={styles.unmarkedText}>לא סומן</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.checkWrap, { backgroundColor: item.done ? tint(item.color, 0.1) : 'transparent' }]}>
          <CheckCircle done={item.done} missed={missed} color={solid ? ink : accent} onToggle={onToggle} size={layout.check} label={`סימון ${item.title}`} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.card,
      paddingVertical: layout.cardPadV,
      paddingStart: space[3],
      paddingEnd: space[3],
      marginBottom: layout.cardGap,
      minHeight: layout.cardMinH,
      ...shadow.card,
    },
    cardMissed: { backgroundColor: colors.missedSoft },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      height: 20,
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      marginBottom: 4,
    },
    pillText: { fontFamily: font.bold, fontSize: fs(11), lineHeight: fs(14) },
    pressed: { transform: [{ scale: 0.985 }] },
    strip: { width: 5, alignSelf: 'stretch', borderRadius: 3, marginEnd: space[3] },
    body: { flex: 1, minWidth: 0, gap: 2 },
    title: { ...text.body, fontFamily: font.bold, textAlign: 'left', flexShrink: 1 },
    titleDone: { color: colors.ink3, textDecorationLine: 'line-through' },
    metaRow: { flexDirection: 'row', alignItems: 'center' },
    metaIcon: { marginEnd: 4 },
    meta: { ...text.sub, fontSize: fs(13), textAlign: 'left', flexShrink: 1 },
    sub: { ...text.caption, textAlign: 'left' },
    missedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-start' },
    missedText: { ...text.caption, color: colors.missed, fontFamily: font.bold },
    unmarkedText: { ...text.caption },
    checkWrap: { borderRadius: radius.pill, padding: 4, marginStart: space[2] },
  });
