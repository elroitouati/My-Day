// כרטיס משימה: פס צבע הקטגוריה, כותרת, שעה וקטגוריה, ועיגול V גדול.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import CheckCircle from './CheckCircle';
import { colors, radius, shadow, space, text, tint } from '../design/tokens';
import { formatTimeRange } from '../logic/dates';

const SOURCE_ICON = { calendar: 'calendar-outline', panmatz: 'barbell-outline' };

export default function TaskCard({ item, index = 0, onToggle, onPress }) {
  const missed = item.missed;
  const meta = [formatTimeRange(item.startTime, item.endTime), item.categoryName].join(' · ');
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 35).duration(260)} layout={LinearTransition.springify().damping(18)}>
      <Pressable
        onPress={onPress}
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
          ) : null}
        </View>
        <View style={[styles.checkWrap, { backgroundColor: item.done ? tint(item.color, 0.1) : 'transparent' }]}>
          <CheckCircle
            done={item.done}
            missed={missed}
            color={item.color}
            onToggle={onToggle}
            size={38}
            label={`סימון ${item.title}`}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingVertical: space[4],
    paddingStart: space[3],
    paddingEnd: space[3],
    marginBottom: space[3],
    minHeight: 76,
    ...shadow.card,
  },
  cardMissed: { backgroundColor: colors.missedSoft },
  pressed: { transform: [{ scale: 0.985 }] },
  strip: { width: 5, alignSelf: 'stretch', borderRadius: 3, marginEnd: space[3] },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...text.body, fontFamily: 'Heebo_700Bold', textAlign: 'left' },
  titleDone: { color: colors.ink3, textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaIcon: { marginEnd: 4 },
  meta: { ...text.sub, fontSize: 13, textAlign: 'left', flexShrink: 1 },
  sub: { ...text.caption, textAlign: 'left' },
  missedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-start' },
  missedText: { ...text.caption, color: colors.missed, fontFamily: 'Heebo_700Bold' },
  checkWrap: { borderRadius: radius.pill, padding: 4, marginStart: space[2] },
});
