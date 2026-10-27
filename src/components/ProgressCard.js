// פס התקדמות "X מתוך Y הושלמו" — מתמלא באנימציה.
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { colors, radius, shadow, space, text } from '../design/tokens';
import { useStyles } from '../state/Theme';

export default function ProgressCard({ done, total }) {
  const styles = useStyles(makeStyles);
  const ratio = total ? done / total : 0;
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(ratio, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [ratio, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  const all = total > 0 && done === total;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>
          {all ? 'הכל הושלם! 🎉' : `${done} מתוך ${total} הושלמו`}
        </Text>
        <Text style={styles.pct}>{Math.round(ratio * 100)}%</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, all && styles.fillDone, fill]} />
      </View>
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: space[4], gap: space[3], ...shadow.card },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { ...text.heading, textAlign: 'left' },
  pct: { ...text.heading, color: colors.brand },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.sunken, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.brand },
  fillDone: { backgroundColor: colors.success },
});
