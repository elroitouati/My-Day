// עיגול ה-V: מתמלא בצבע הקטגוריה, ה-V "נכתב" פנימה, קפיצה קטנה ורטט קל.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withSpring,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '../design/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHECK_LEN = 20;

export default function CheckCircle({ done: savedDone, color, missed, onToggle, size = 36, label }) {
  // מצב אופטימי: הסימון מגיב מיד, ומתיישר עם הנתונים כשהם מתעדכנים
  const [done, setDone] = useState(savedDone);
  useEffect(() => setDone(savedDone), [savedDone]);
  const fill = useSharedValue(done ? 1 : 0);
  const draw = useSharedValue(done ? 1 : 0);
  const pop = useSharedValue(1);

  useEffect(() => {
    fill.value = withSpring(done ? 1 : 0, { damping: 16, stiffness: 220 });
    draw.value = done
      ? withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })
      : withTiming(0, { duration: 140 });
  }, [done, fill, draw]);

  const ring = missed && !done ? colors.missed : color;

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fill.value }],
    opacity: Math.min(1, fill.value * 1.4),
  }));
  const wrapStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const pathProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LEN * (1 - draw.value) }));

  const press = () => {
    pop.value = withSequence(withTiming(0.82, { duration: 90 }), withSpring(1, { damping: 7, stiffness: 260 }));
    Haptics.impactAsync(done ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setDone(!done);
    onToggle?.(!done);
  };

  const r = size / 2;
  return (
    <Pressable
      onPress={press}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[styles.ring, { width: size, height: size, borderRadius: r, borderColor: ring }, wrapStyle]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: r, backgroundColor: color }, fillStyle]} />
        <Svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24">
          <AnimatedPath
            d="M5.5 12.5l4.2 4.2L18.5 8"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={CHECK_LEN}
            animatedProps={pathProps}
          />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
});
