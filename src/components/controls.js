// רכיבי טופס קטנים: כפתור, צ'יפים, בחירת ימים, סטפר, שדה, שורת הגדרות.
import React from 'react';
import { View, Text, Pressable, TextInput, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadow, space, text, font } from '../design/tokens';
import { HEB_WEEKDAYS_LETTER } from '../logic/dates';
import { useStyles } from '../state/Theme';

const tap = () => Haptics.selectionAsync().catch(() => {});

export function Button({ title, onPress, kind = 'primary', icon, disabled, style }) {
  const styles = useStyles(makeStyles);
  const k = BTN()[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.btn, k.box, pressed && styles.btnPressed, disabled && styles.disabled, style]}
    >
      {icon ? <Ionicons name={icon} size={18} color={k.text.color} /> : null}
      <Text style={[styles.btnText, k.text]}>{title}</Text>
    </Pressable>
  );
}
const BTN = () => ({
  primary: { box: { backgroundColor: colors.brand, ...shadow.float, shadowOpacity: 0.2 }, text: { color: colors.onBrand } },
  soft: { box: { backgroundColor: colors.brandSoft }, text: { color: colors.brand } },
  danger: { box: { backgroundColor: colors.missedSoft }, text: { color: colors.missed } },
  ghost: { box: { backgroundColor: 'transparent' }, text: { color: colors.ink2 } },
});

export function Label({ children }) {
  const styles = useStyles(makeStyles);
  return <Text style={styles.label}>{children}</Text>;
}

export function Field({ value, onChangeText, placeholder, multiline, autoFocus, ...rest }) {
  const styles = useStyles(makeStyles);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.ink3}
      multiline={multiline}
      autoFocus={autoFocus}
      style={[styles.field, multiline && styles.fieldMulti]}
      {...rest}
    />
  );
}

export function Chips({ options, value, onChange, colorFor }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const active = o.value === value;
        const own = colorFor ? colorFor(o) : null;
        const c = own || colors.brand;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={[styles.chip, active && { backgroundColor: c, borderColor: c }]}
          >
            {own && !active ? <View style={[styles.dot, { backgroundColor: own }]} /> : null}
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function DayToggles({ value, onChange }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.days}>
      {HEB_WEEKDAYS_LETTER.map((l, d) => {
        const on = value.includes(d);
        return (
          <Pressable
            key={d}
            onPress={() => {
              tap();
              onChange(on ? value.filter((x) => x !== d) : [...value, d].sort());
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            style={[styles.day, on && styles.dayOn]}
          >
            <Text style={[styles.dayText, on && styles.dayTextOn]}>{l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({ value, onChange, min = 1, max = 365, suffix }) {
  const styles = useStyles(makeStyles);
  const set = (v) => {
    tap();
    onChange(Math.max(min, Math.min(max, v)));
  };
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => set(value + 1)} style={styles.stepBtn} accessibilityLabel="הוספה">
        <Ionicons name="add" size={22} color={colors.brand} />
      </Pressable>
      <Text style={styles.stepValue}>
        {value}
        {suffix ? ` ${suffix}` : ''}
      </Text>
      <Pressable onPress={() => set(value - 1)} style={styles.stepBtn} accessibilityLabel="הפחתה">
        <Ionicons name="remove" size={22} color={colors.brand} />
      </Pressable>
    </View>
  );
}

// שורה בתוך קבוצה (הגדרות / שדות תאריך ושעה)
export function Row({ icon, iconColor, title, subtitle, value, onPress, trailing, chevron, danger }) {
  const styles = useStyles(makeStyles);
  const content = (
    <>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: (iconColor || colors.brand) + '1A' }]}>
          <Ionicons name={icon} size={18} color={iconColor || colors.brand} />
        </View>
      ) : null}
      <View style={styles.rowTexts}>
        <Text style={[styles.rowTitle, danger && { color: colors.missed }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {value != null ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
      {trailing}
      {chevron ? <Ionicons name="chevron-back" size={18} color={colors.ink3} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

export function Group({ title, footer, children }) {
  const styles = useStyles(makeStyles);
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.groupWrap}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.group}>
        {items.map((c, i) => (
          <View key={i}>
            {i > 0 ? <View style={styles.sep} /> : null}
            {c}
          </View>
        ))}
      </View>
      {footer ? <Text style={styles.groupFooter}>{footer}</Text> : null}
    </View>
  );
}

export function Toggle({ value, onValueChange }) {
  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        tap();
        onValueChange(v);
      }}
      trackColor={{ true: colors.brand, false: colors.line }}
      thumbColor="#FFFFFF"
    />
  );
}

const makeStyles = () => StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    paddingHorizontal: space[5],
  },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
  btnText: { fontFamily: font.bold, fontSize: 16 },
  label: { ...text.caption, color: colors.ink2, fontFamily: font.bold, marginBottom: -space[2], textAlign: 'left' },
  field: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    minHeight: 52,
    fontFamily: font.medium,
    fontSize: 16,
    color: colors.ink,
    textAlign: 'left', // ב-RTL אנדרואיד מחליף left↔right, כך ש-left = תחילת השורה (ימין)
  },
  fieldMulti: { minHeight: 90, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  chipText: { fontFamily: font.medium, fontSize: 14, color: colors.ink2 },
  chipTextActive: { color: '#FFFFFF', fontFamily: font.bold },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  dayText: { fontFamily: font.bold, fontSize: 15, color: colors.ink2 },
  dayTextOn: { color: '#FFFFFF' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    padding: 4,
  },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  stepValue: { ...text.heading, minWidth: 84, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], minHeight: 56, paddingVertical: space[2] },
  rowPressed: { backgroundColor: colors.sunken },
  rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTexts: { flex: 1, minWidth: 0 },
  rowTitle: { ...text.body, textAlign: 'left' },
  rowSub: { ...text.caption, textAlign: 'left' },
  rowValue: { ...text.sub, color: colors.brand, fontFamily: font.bold, maxWidth: 170 },
  groupWrap: { gap: space[2] },
  groupTitle: { ...text.caption, fontFamily: font.bold, color: colors.ink2, paddingHorizontal: space[2], textAlign: 'left' },
  group: { backgroundColor: colors.card, borderRadius: radius.card, overflow: 'hidden', ...shadow.card },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginStart: space[4] },
  groupFooter: { ...text.caption, paddingHorizontal: space[2], textAlign: 'left' },
});
