// סרגל טאבים תחתון: היום / שבוע / חודש / הגדרות, עם כפתור + צף מעליו.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Fab from './Fab';
import { useAppState } from '../state/AppState';
import { colors, shadow, font } from '../design/tokens';

const ICONS = {
  Today: ['today', 'today-outline'],
  Week: ['calendar', 'calendar-outline'],
  Month: ['grid', 'grid-outline'],
  Settings: ['settings', 'settings-outline'],
};

function Tab({ label, icon, focused, onPress }) {
  const pill = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(focused ? 1 : 0.6, { damping: 15 }) }],
    opacity: withSpring(focused ? 1 : 0),
  }));
  return (
    <Pressable onPress={onPress} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, pill]} />
        <Ionicons name={icon} size={22} color={focused ? colors.brand : colors.ink3} />
      </View>
      <Text style={[styles.label, focused && styles.labelOn]}>{label}</Text>
    </Pressable>
  );
}

export default function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { openTaskSheet, today } = useAppState();
  const current = state.routes[state.index].name;
  return (
    <>
      {current !== 'Settings' ? <Fab bottom={72 + insets.bottom + 14} onPress={() => openTaskSheet({ date: today })} /> : null}
      <View style={[styles.bar, { paddingBottom: insets.bottom + 6 }]}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const { options } = descriptors[route.key];
          return (
            <Tab
              key={route.key}
              label={options.title}
              icon={ICONS[route.name][focused ? 0 : 1]}
              focused={focused}
              onPress={() => {
                const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) {
                  Haptics.selectionAsync().catch(() => {});
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
  tab: { flex: 1, alignItems: 'center', gap: 2, minHeight: 56 },
  iconWrap: { width: 58, height: 32, alignItems: 'center', justifyContent: 'center' },
  pill: { ...StyleSheet.absoluteFillObject, borderRadius: 16, backgroundColor: colors.brandSoft },
  label: { fontFamily: font.medium, fontSize: 12, color: colors.ink3 },
  labelOn: { color: colors.brand, fontFamily: font.bold },
});
