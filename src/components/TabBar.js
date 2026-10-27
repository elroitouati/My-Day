// סרגל טאבים תחתון: היום / שבוע / חודש / הגדרות, עם כפתור + צף מעליו.
// ארבעה סגנונות לבחירה בהגדרות: קלאסי, צף, מינימלי ומודגש.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Fab from './Fab';
import { useAppState } from '../state/AppState';
import { colors, shadow, font, fs } from '../design/tokens';
import { useStyles, useTheme } from '../state/Theme';
import { haptic, motion } from '../design/feedback';

const ICONS = {
  Today: ['today', 'today-outline'],
  Week: ['calendar', 'calendar-outline'],
  Month: ['grid', 'grid-outline'],
  Settings: ['settings', 'settings-outline'],
};

function Tab({ variant, label, icon, focused, onPress }) {
  const styles = useStyles(makeStyles);
  const pill = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(focused ? 1 : 0.6, { damping: 15 }) }],
    opacity: withSpring(focused ? 1 : 0),
  }));
  const a11y = { accessibilityRole: 'tab', accessibilityState: { selected: focused }, accessibilityLabel: label };

  if (variant === 'bold') {
    return (
      <Animated.View layout={motion(LinearTransition.springify().damping(18))} style={focused ? styles.boldWrapOn : styles.boldWrap}>
        <Pressable onPress={onPress} style={[styles.boldTab, focused && styles.boldTabOn]} {...a11y}>
          <Ionicons name={icon} size={22} color={focused ? colors.onBrand : colors.ink3} />
          {focused ? <Text style={styles.boldLabel} numberOfLines={1}>{label}</Text> : null}
        </Pressable>
      </Animated.View>
    );
  }

  if (variant === 'minimal') {
    return (
      <Pressable onPress={onPress} style={styles.tab} {...a11y}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={24} color={focused ? colors.brand : colors.ink3} />
        </View>
        <View style={[styles.dot, focused && styles.dotOn]} />
      </Pressable>
    );
  }

  // classic / floating
  return (
    <Pressable onPress={onPress} style={styles.tab} {...a11y}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, pill]} />
        <Ionicons name={icon} size={22} color={focused ? colors.brand : colors.ink3} />
      </View>
      <Text style={[styles.label, focused && styles.labelOn]}>{label}</Text>
    </Pressable>
  );
}

export default function TabBar({ state, descriptors, navigation }) {
  const styles = useStyles(makeStyles);
  const { tabStyle } = useTheme();
  const insets = useSafeAreaInsets();
  const { openTaskSheet, today } = useAppState();
  const current = state.routes[state.index].name;
  const floating = tabStyle === 'floating';

  const tabs = state.routes.map((route, i) => {
    const focused = state.index === i;
    const { options } = descriptors[route.key];
    return (
      <Tab
        key={route.key}
        variant={tabStyle}
        label={options.title}
        icon={ICONS[route.name][focused ? 0 : 1]}
        focused={focused}
        onPress={() => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) {
            haptic.tap();
            navigation.navigate(route.name);
          }
        }}
      />
    );
  });

  const barHeight = floating ? 84 : tabStyle === 'minimal' ? 56 : 72;
  return (
    <>
      {current !== 'Settings' ? <Fab bottom={barHeight + insets.bottom + 14} onPress={() => openTaskSheet({ date: today })} /> : null}
      {floating ? (
        <View style={[styles.floatOuter, { paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.floatBar}>{tabs}</View>
        </View>
      ) : (
        <View
          style={[
            tabStyle === 'minimal' ? styles.minimalBar : styles.bar,
            tabStyle === 'bold' && styles.boldBar,
            { paddingBottom: insets.bottom + 6 },
          ]}
        >
          {tabs}
        </View>
      )}
    </>
  );
}

const makeStyles = () => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingTop: 8,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    ...shadow.card,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  floatOuter: { paddingHorizontal: 16, paddingTop: 6, backgroundColor: colors.bg },
  floatBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 30,
    paddingVertical: 8,
    ...shadow.card,
    shadowOpacity: colors.mode === 'dark' ? 0.5 : 0.12,
    elevation: 10,
  },
  minimalBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  boldBar: { paddingHorizontal: 12, gap: 6, alignItems: 'center' },
  tab: { flex: 1, alignItems: 'center', gap: 2, minHeight: 48 },
  iconWrap: { width: 58, height: 32, alignItems: 'center', justifyContent: 'center' },
  pill: { ...StyleSheet.absoluteFillObject, borderRadius: 16, backgroundColor: colors.brandSoft },
  label: { fontFamily: font.medium, fontSize: fs(12), color: colors.ink3 },
  labelOn: { color: colors.brand, fontFamily: font.bold },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent', marginTop: 2 },
  dotOn: { backgroundColor: colors.brand },
  boldWrap: { flex: 1 },
  boldWrapOn: { flex: 2.2 },
  boldTab: { height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  boldTabOn: { backgroundColor: colors.brand },
  boldLabel: { fontFamily: font.bold, fontSize: fs(14), color: colors.onBrand },
});
