// גיליון תחתון נקי: עולה מלמטה עם קפיץ, נסגר בהחלקה למטה או בלחיצה על הרקע.
import React, { useEffect, useState } from 'react';
import { Modal, View, Pressable, StyleSheet, KeyboardAvoidingView, ScrollView, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, space } from '../design/tokens';

export default function BottomSheet({ visible, onClose, children, footer, maxHeightRatio = 0.9 }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(height);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      y.value = height;
      y.value = withSpring(0, { damping: 22, stiffness: 210, mass: 0.9 });
      fade.value = withTiming(1, { duration: 220 });
    } else if (mounted) {
      fade.value = withTiming(0, { duration: 180 });
      y.value = withTiming(height, { duration: 220 }, (fin) => fin && runOnJS(setMounted)(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = Gesture.Pan()
    .activeOffsetY(12)
    .onUpdate((e) => {
      y.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 900) runOnJS(onClose)();
      else y.value = withSpring(0, { damping: 20, stiffness: 220 });
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (!mounted) return null;
  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.flex}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
          <Pressable style={styles.flex} onPress={onClose} accessibilityLabel="סגירה" />
        </Animated.View>
        <KeyboardAvoidingView behavior="height" style={styles.bottom} pointerEvents="box-none">
          <Animated.View
            style={[styles.sheet, { maxHeight: height * maxHeightRatio, paddingBottom: insets.bottom + space[3] }, sheetStyle]}
          >
            <GestureDetector gesture={pan}>
              <View style={styles.grabZone}>
                <View style={styles.grabber} />
              </View>
            </GestureDetector>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrim: { backgroundColor: colors.scrim },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    overflow: 'hidden',
  },
  grabZone: { alignItems: 'center', paddingTop: space[3], paddingBottom: space[2] },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line },
  content: { paddingHorizontal: space[5], paddingBottom: space[4], gap: space[4] },
  footer: { paddingHorizontal: space[5], paddingTop: space[2] },
});
