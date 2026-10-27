// מעטפת מסך: רקע, ריווח בטוח, כותרת וגלילה. כניסה רכה בכל מעבר למסך.
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, space, text, font } from '../design/tokens';
import { useStyles } from '../state/Theme';
import { motion } from '../design/feedback';

export function useFocusKey() {
  const [k, setK] = useState(0);
  useFocusEffect(useCallback(() => setK((x) => x + 1), []));
  return k;
}

export default function Screen({ title, eyebrow, subtitle, onBack, action, children, scroll = true, onRefresh, bottomPad = 120 }) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const focusKey = useFocusKey();
  const [refreshing, setRefreshing] = useState(false);
  const header = (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={styles.back} accessibilityLabel="חזרה">
          <Ionicons name="arrow-forward" size={24} color={colors.ink} />
        </Pressable>
      ) : null}
      <View style={styles.headerTexts}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
  const refresh = onRefresh
    ? (
      <RefreshControl
        refreshing={refreshing}
        colors={[colors.brand]}
        onRefresh={async () => {
          setRefreshing(true);
          try {
            await onRefresh();
          } finally {
            setRefreshing(false);
          }
        }}
      />
    )
    : undefined;
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Animated.View key={focusKey} entering={motion(FadeIn.duration(220))} style={styles.root}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
            showsVerticalScrollIndicator={false}
            refreshControl={refresh}
          >
            {header}
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.root, styles.contentNoScroll]}>
            {header}
            {children}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space[4], gap: space[3] },
  contentNoScroll: { paddingHorizontal: space[4], gap: space[3] },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingTop: space[4], paddingBottom: space[2] },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  headerTexts: { flex: 1, minWidth: 0 },
  eyebrow: { ...text.caption, color: colors.brand, fontFamily: font.bold, textAlign: 'left' },
  title: { ...text.hero, textAlign: 'left' },
  subtitle: { ...text.sub, textAlign: 'left' },
});
