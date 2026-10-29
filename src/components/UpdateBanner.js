// עדכון "באוויר": בכל פתיחה/חזרה לאפליקציה בודקים אם יש גרסה חדשה,
// מורידים אותה ברקע, ומציגים פס קטן — לחיצה מפעילה מחדש עם העדכון.
import React, { useEffect, useState } from 'react';
import { AppState, Pressable, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, shadow, fs } from '../design/tokens';
import { useStyles } from '../state/Theme';
import { motion } from '../design/feedback';
import { checkForUpdate, applyUpdate, useUpdateState } from '../services/useUpdates';

export default function UpdateBanner() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { status } = useUpdateState();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkForUpdate();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && checkForUpdate());
    return () => sub.remove();
  }, []);

  if (status !== 'ready' || dismissed) return null;
  return (
    <Animated.View entering={motion(FadeInUp)} exiting={motion(FadeOutUp)} style={[styles.wrap, { top: insets.top + 8 }]}>
      <Pressable onPress={() => applyUpdate().catch(() => {})} style={styles.banner} accessibilityRole="button">
        <Ionicons name="sparkles" size={18} color={colors.onBrand} />
        <Text style={styles.text}>עדכון חדש מוכן — לחיצה להפעלה</Text>
        <Pressable onPress={() => setDismissed(true)} hitSlop={10} accessibilityLabel="אחר כך">
          <Ionicons name="close" size={18} color={colors.onBrand} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 16,
      right: 16,
      alignItems: 'center',
      zIndex: 50,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.brand,
      paddingHorizontal: 18,
      height: 44,
      borderRadius: 22,
      ...shadow.float,
    },
    text: { fontFamily: font.bold, fontSize: fs(14), color: colors.onBrand },
  });
