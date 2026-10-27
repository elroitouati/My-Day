// כרטיס משימה: פס צבע הקטגוריה, כותרת, שעה וקטגוריה, ועיגול V גדול.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import CheckCircle from './CheckCircle';
import { colors, radius, shadow, space, text, tint, fs, font, layout } from '../design/tokens';
import { formatTimeRange } from '../logic/dates';
import { useStyles } from '../state/Theme';
import { motion } from '../design/feedback';

const SOURCE_ICON = { calendar: 'calendar-outline', panmatz: 'barbell-outline' };

export default function TaskCard({ item, index = 0, onToggle, onPress, onLongPress }) {
  const styles = useStyles(makeStyles);
  const missed = item.missed;
  const meta = [formatTimeRange(item.startTime, item.endTime), item.categoryName].filter(Boolean).join(' · ');
  return (
    <Animated.View entering={motion(FadeInDown.delay(Math.min(index, 8) * 35).duration(260))} layout={motion(LinearTransition.springify().damping(18))}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        style={({ pressed }) => [styles.card, missed && styles.cardMissed, pressed && onPress && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${meta}${item.done ? ', הושלם' : missed ? ', פספוס' : ''}`}
      >
        <View style={[styles.strip, { backgroundColor: item.color }]} />
        <View style={styles.body}>
          <Text style={[styles.title, item.done && styles.titleDone]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            {SOURCE_ICON[item.source] ? (
              <Ionicons name={SOURCE_ICON[item.source]} size={13} color={colors.ink3} style={styles.metaIcon} />
            ) : null}
            {item.recurring ? <Ionicons name="repeat" size={13} color={colors.ink3} style={styles.metaIcon} /> : null}
            <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
          </View>
          {item.subtitle ? <Text style={styles.sub} numberOfLines={1}>{item.subtitle}</Text> : null}
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
            color={item.color}
            onToggle={onToggle}
            size={layout.check}
            label={`סימון ${item.title}`}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = () => StyleSheet.create({
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
  pressed: { transform: [{ scale: 0.985 }] },
  strip: { width: 5, alignSelf: 'stretch', borderRadius: 3, marginEnd: space[3] },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...text.body, fontFamily: font.bold, textAlign: 'left' },
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
