// עדכון "באוויר": בכל פתיחה/חזרה לאפליקציה בודקים אם יש גרסה חדשה,
// מורידים אותה ברקע, ומציגים פס קטן — לחיצה מפעילה מחדש עם העדכון.
import React, { useEffect, useState } from 'react';
import { AppState, Pressable, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { colors, font, shadow, fs } from '../design/tokens';
import { useStyles } from '../state/Theme';
import { motion } from '../design/feedback';

export default function UpdateBanner() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return undefined;
    let busy = false;
    const check = async () => {
      if (busy) return;
      busy = true;
      try {
        const res = await Updates.checkForUpdateAsync();
        if (res.isAvailable) {
          await Updates.fetchUpdateAsync();
          setReady(true);
        }
      } catch {
        // אין רשת וכו' — ננסה בפעם הבאה
      } finally {
        busy = false;
      }
    };
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);

  if (!ready) return null;
  return (
    <Animated.View entering={motion(FadeInUp)} exiting={motion(FadeOutUp)} style={[styles.wrap, { top: insets.top + 8 }]}>
      <Pressable onPress={() => Updates.reloadAsync().catch(() => {})} style={styles.banner} accessibilityRole="button">
        <Ionicons name="sparkles" size={18} color={colors.onBrand} />
        <Text style={styles.text}>עדכון חדש מוכן — לחיצה להפעלה</Text>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = () => StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 50 },
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
