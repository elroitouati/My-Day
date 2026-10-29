// מסך פתיחה לפתיחה הראשונה: מה האפליקציה עושה, והרשאות (התראות, יומן) ופנמ"צ — כל אחד בצעד משלו.
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInLeft, SlideOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/controls';
import { requestNotificationPermission, rescheduleNotifications } from '../services/notifications';
import { requestCalendarPermission, refreshCalendarCache } from '../services/calendar';
import { afterChange } from '../services/actions';
import { setSetting } from '../db/repo';
import { LATEST_CHANGES } from '../changelog';
import { colors, space, text, font, fs, radius } from '../design/tokens';
import { useStyles } from '../state/Theme';
import { motion, haptic } from '../design/feedback';

const FEATURES = [
  {
    icon: 'repeat',
    title: 'משימות חד-פעמיות וחוזרות',
    sub: 'כל יום, ימים בשבוע, כל כמה ימים או פעם בחודש',
  },
  {
    icon: 'apps',
    title: 'ווידג׳ט למסך הבית',
    sub: 'מסמנים V בלי לפתוח את האפליקציה',
  },
  {
    icon: 'calendar',
    title: 'היומן שלך באותו מקום',
    sub: 'אירועים מ-Google Calendar לצד המשימות',
  },
  {
    icon: 'notifications',
    title: 'תזכורות',
    sub: 'לפני כל משימה, ותזכורת בוקר וערב',
  },
];

export default function Onboarding({ onDone }) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState({});

  const next = () => {
    haptic.tap();
    setStep((s) => s + 1);
  };
  const act = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch {
      // ממשיכים בכל מקרה
    } finally {
      setBusy(false);
      next();
    }
  };

  const finish = async () => {
    haptic.success();
    await setSetting('onboarded', true);
    await setSetting('seenChangelog', LATEST_CHANGES.id);
    onDone();
  };

  const steps = [
    {
      key: 'welcome',
      icon: 'sunny',
      title: 'ברוך הבא ל-My Day',
      sub: 'כל מה שיש לך היום — במקום אחד, בלי בלגן.',
      body: (
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={20} color={colors.brand} />
              </View>
              <View style={styles.featureTexts}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureSub}>{f.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      ),
      primary: { title: 'בוא נתחיל', onPress: next },
    },
    {
      key: 'notifications',
      icon: 'notifications',
      title: 'תזכורות',
      sub: 'כדי להזכיר לך לפני כל משימה (אפשר לבחור כמה זמן לפני), ובבוקר ובערב. אפשר לשנות הכל בהגדרות.',
      primary: {
        title: 'אפשר התראות',
        onPress: () =>
          act(async () => {
            await setSetting('askedNotifications', true);
            if (await requestNotificationPermission()) await rescheduleNotifications();
          }),
      },
      secondary: { title: 'אחר כך', onPress: next },
    },
    {
      key: 'calendar',
      icon: 'calendar',
      title: 'Google Calendar',
      sub: 'להציג את האירועים מהיומן שבטלפון לצד המשימות? רק קריאה — My Day לא משנה כלום ביומן.',
      primary: {
        title: 'כן, להציג',
        onPress: () =>
          act(async () => {
            if (await requestCalendarPermission()) {
              await setSetting('calendarEnabled', true);
              await refreshCalendarCache();
              await afterChange();
            } else {
              setState((s) => ({ ...s, calendarDenied: true }));
            }
          }),
      },
      secondary: { title: 'לא עכשיו', onPress: next },
    },
    {
      key: 'panmatz',
      icon: 'barbell',
      title: 'משתמש בפנמ"צ?',
      sub: 'אם יש לך את אפליקציית פנמ"צ, האימונים יופיעו גם כאן וסימון בצד אחד יתעדכן בשני. ההתחברות — בהגדרות.',
      primary: {
        title: 'כן, יש לי',
        onPress: () => act(() => setSetting('panmatzEnabled', true)),
      },
      secondary: {
        title: 'לא',
        onPress: () => act(() => setSetting('panmatzEnabled', false)),
      },
    },
    {
      key: 'done',
      icon: 'checkmark-done',
      title: 'הכל מוכן!',
      sub: 'טיפ: הוסף את הווידג׳ט — לחיצה ארוכה על מסך הבית ← ווידג׳טים ← My Day. בהגדרות אפשר לעצב אותו ואת האפליקציה כמו שבא לך.',
      body: state.calendarDenied ? (
        <Pressable onPress={() => Linking.openSettings()} style={styles.note}>
          <Text style={styles.noteText}>לא התקבלה הרשאה ליומן. אפשר לאשר בהגדרות הטלפון ←</Text>
        </Pressable>
      ) : null,
      primary: { title: 'יאללה', onPress: finish },
    },
  ];
  const s = steps[step];

  return (
    <Animated.View
      exiting={motion(FadeOut.duration(250))}
      style={[
        styles.root,
        {
          paddingTop: insets.top + space[6],
          paddingBottom: insets.bottom + space[4],
        },
      ]}
    >
      <View style={styles.dots}>
        {steps.map((x, i) => (
          <View key={x.key} style={[styles.dot, i === step && styles.dotOn, i < step && styles.dotPast]} />
        ))}
      </View>
      <Animated.View key={s.key} entering={motion(SlideInLeft.springify().damping(18))} exiting={motion(SlideOutRight.duration(160))} style={styles.page}>
        <Animated.View entering={motion(FadeIn.delay(120))} style={styles.hero}>
          <Ionicons name={s.icon} size={44} color={colors.onBrand} />
        </Animated.View>
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.sub}>{s.sub}</Text>
        {s.body}
      </Animated.View>
      <View style={styles.actions}>
        <Button title={busy ? 'רגע…' : s.primary.title} onPress={s.primary.onPress} disabled={busy} />
        {s.secondary ? <Button title={s.secondary.title} kind="ghost" onPress={s.secondary.onPress} disabled={busy} /> : null}
      </View>
    </Animated.View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.bg,
      paddingHorizontal: space[6],
      zIndex: 100,
    },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
    dotOn: { width: 24, backgroundColor: colors.brand },
    dotPast: { backgroundColor: colors.brandSoft },
    page: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: space[3],
    },
    hero: {
      width: 96,
      height: 96,
      borderRadius: 32,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space[3],
    },
    title: { ...text.hero, textAlign: 'center' },
    sub: {
      ...text.sub,
      fontSize: fs(16),
      lineHeight: fs(24),
      textAlign: 'center',
      maxWidth: 340,
    },
    features: {
      alignSelf: 'stretch',
      gap: space[3],
      marginTop: space[4],
      backgroundColor: colors.card,
      borderRadius: radius.card,
      padding: space[4],
    },
    feature: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.brandSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureTexts: { flex: 1 },
    featureTitle: {
      fontFamily: font.bold,
      fontSize: fs(15),
      color: colors.ink,
      textAlign: 'left',
    },
    featureSub: { ...text.caption, color: colors.ink2, textAlign: 'left' },
    note: {
      marginTop: space[3],
      backgroundColor: colors.sunken,
      borderRadius: radius.md,
      padding: space[3],
    },
    noteText: { ...text.sub, textAlign: 'center' },
    actions: { gap: space[2] },
  });
