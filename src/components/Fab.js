// כפתור "+" צף להוספת משימה
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, shadow } from '../design/tokens';

export default function Fab({ onPress, bottom }) {
  return (
    <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.wrap, { bottom }]}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPress();
        }}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="הוספת משימה"
      >
        <Ionicons name="add" size={32} color={colors.onBrand} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', end: 20 },
  fab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.float,
  },
  pressed: { transform: [{ scale: 0.92 }], backgroundColor: colors.brandDeep },
});
