// כרטיס משימה: פס צבע הקטגוריה, כותרת, שעה וקטגוריה, ועיגול V גדול.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import CheckCircle from './CheckCircle';
import { colors, radius, shadow, space, text, tint, fs, font, layout, STAR, onColor } from '../design/tokens';
import { formatTimeRange } from '../logic/dates';
import { useStyles, useTheme } from '../state/Theme';
import { motion } from '../design/feedback';

const SOURCE_ICON = { calendar: 'calendar-outline', panmatz: 'barbell-outline' };

// משימה חשובה (שעוד לא בוצעה) — לפי הסגנון שנבחר בהגדרות:
//  glow  — מסגרת וזוהר בצבע המשימה + כוכב
//  badge — כרטיס רגיל עם תווית "חשוב"
//  bold  — כרטיס מלא בצבע המשימה
export const IMPORTANT_STYLES = [
  { id: 'glow', name: 'זוהר' },
  { id: 'badge', name: 'תווית' },
  { id: 'bold', name: 'מלא' },
];

export default function TaskCard({ item, index = 0, onToggle, onPress, onLongPress, importantStyle }) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const missed = item.missed;
  const imp = item.important && !item.done ? importantStyle || theme.importantStyle || 'glow' : null;
  const filled = imp === 'bold';
  const ink = filled ? onColor(item.color) : null;
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
          imp === 'glow' && [styles.glow, { borderColor: item.color, backgroundColor: tint(item.color, 0.07), shadowColor: item.color }],
          filled && [styles.filled, { backgroundColor: item.color, shadowColor: item.color }],
          pressed && onPress && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${meta}${item.done ? ', הושלם' : missed ? ', פספוס' : ''}`}
      >
        {filled ? null : <View style={[styles.strip, { backgroundColor: item.color }]} />}
        <View style={styles.body}>
          {imp === 'badge' ? (
            <View style={styles.badge}>
              <Ionicons name="star" size={12} color={STAR} />
              <Text style={styles.badgeText}>חשוב</Text>
            </View>
          ) : null}
          <View style={styles.titleRow}>
            {imp === 'glow' || filled ? <Ionicons name="star" size={16} color={filled ? ink : STAR} style={styles.star} /> : null}
            <Text style={[styles.title, item.done && styles.titleDone, filled && { color: ink }]} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
          <View style={styles.metaRow}>
            {SOURCE_ICON[item.source] ? (
              <Ionicons name={SOURCE_ICON[item.source]} size={13} color={filled ? ink : colors.ink3} style={styles.metaIcon} />
            ) : null}
            {item.recurring ? <Ionicons name="repeat" size={13} color={filled ? ink : colors.ink3} style={styles.metaIcon} /> : null}
            <Text style={[styles.meta, filled && { color: ink, opacity: 0.85 }]} numberOfLines={1}>
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
          <CheckCircle
            done={item.done}
            missed={missed}
            color={filled ? ink : item.color}
            onToggle={onToggle}
            size={layout.check}
            label={`סימון ${item.title}`}
          />
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
    glow: { borderWidth: 2, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
    filled: { shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
    titleRow: { flexDirection: 'row', alignItems: 'center' },
    star: { marginEnd: 6 },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: tint(STAR, 0.16),
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginBottom: 2,
    },
    badgeText: { fontFamily: font.bold, fontSize: fs(12), color: '#B87400' },
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
