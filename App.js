import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nManager, StyleSheet, View, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, Heebo_400Regular, Heebo_500Medium, Heebo_700Bold, Heebo_800ExtraBold } from '@expo-google-fonts/heebo';
import { Rubik_400Regular, Rubik_500Medium, Rubik_700Bold, Rubik_800ExtraBold } from '@expo-google-fonts/rubik';
import { Assistant_400Regular, Assistant_600SemiBold, Assistant_700Bold, Assistant_800ExtraBold } from '@expo-google-fonts/assistant';
import { VarelaRound_400Regular } from '@expo-google-fonts/varela-round';
import { FrankRuhlLibre_400Regular, FrankRuhlLibre_500Medium, FrankRuhlLibre_700Bold, FrankRuhlLibre_900Black } from '@expo-google-fonts/frank-ruhl-libre';
import { AmaticSC_400Regular, AmaticSC_700Bold } from '@expo-google-fonts/amatic-sc';

import { AppStateProvider, useAppState } from './src/state/AppState';
import TabBar from './src/components/TabBar';
import TaskSheet from './src/sheets/TaskSheet';
import TodayScreen from './src/screens/TodayScreen';
import WeekScreen from './src/screens/WeekScreen';
import MonthScreen from './src/screens/MonthScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DayScreen from './src/screens/DayScreen';
import WidgetEditorScreen from './src/screens/WidgetEditorScreen';
import UpdateBanner from './src/components/UpdateBanner';
import Onboarding from './src/onboarding/Onboarding';
import WhatsNewSheet from './src/sheets/WhatsNewSheet';
import { LATEST_CHANGES } from './src/changelog';
import { registerBackgroundTask } from './src/services/background';
import { setupNotifications, requestNotificationPermission, rescheduleNotifications } from './src/services/notifications';
import { getSettings, setSetting } from './src/db/repo';
import { colors } from './src/design/tokens';
import { ThemeProvider, useStyles, useTheme, themeFromSettings } from './src/state/Theme';

// RTL מלא בכל מסך. תוסף ה-config (plugins/withForceRTL) מפעיל אותו כבר בהפעלה הראשונה.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
SplashScreen.preventAutoHideAsync().catch(() => {});

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const navThemeFor = () => ({
  ...DefaultTheme,
  dark: colors.mode === 'dark',
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    primary: colors.brand,
    text: colors.ink,
    border: colors.line,
  },
});

function Tabs() {
  const { startTab } = useTheme(); // המסך שנפתח — לפי ההגדרות
  return (
    <Tab.Navigator initialRouteName={startTab} tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Today" component={TodayScreen} options={{ title: 'היום' }} />
      <Tab.Screen name="Week" component={WeekScreen} options={{ title: 'שבוע' }} />
      <Tab.Screen name="Month" component={MonthScreen} options={{ title: 'חודש' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'הגדרות' }} />
    </Tab.Navigator>
  );
}

// קישור myday://add (מכפתור ה-+ בווידג'ט) פותח גיליון משימה חדשה
function DeepLinks() {
  const { openTaskSheet, today } = useAppState();
  useEffect(() => {
    const handle = (url) => {
      if (url && url.includes('add')) openTaskSheet({ date: today });
    };
    Linking.getInitialURL()
      .then(handle)
      .catch(() => {});
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function App() {
  // כל הגופנים לבחירה ב"מראה" נטענים מראש, כדי שהחלפה תהיה מיידית
  const [fontsLoaded, fontError] = useFonts({
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_700Bold,
    Heebo_800ExtraBold,
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_700Bold,
    Rubik_800ExtraBold,
    Assistant_400Regular,
    Assistant_600SemiBold,
    Assistant_700Bold,
    Assistant_800ExtraBold,
    VarelaRound_400Regular,
    FrankRuhlLibre_400Regular,
    FrankRuhlLibre_500Medium,
    FrankRuhlLibre_700Bold,
    FrankRuhlLibre_900Black,
    AmaticSC_400Regular,
    AmaticSC_700Bold,
  });
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    (async () => {
      // הערכה השמורה נטענת לפני הרינדור הראשון, כדי שלא יהבהב מסך בהיר במצב כהה
      const s = await getSettings().catch(() => ({}));
      setTheme(themeFromSettings(s));
      await setupNotifications().catch(() => {});
      registerBackgroundTask();
      // משתמש ותיק שלא עבר במסך הפתיחה — בקשת הרשאת התראות (אנדרואיד 13+). חדשים מאשרים במסך הפתיחה.
      if (s.onboarded && !s.askedNotifications) {
        await setSetting('askedNotifications', true);
        if (await requestNotificationPermission().catch(() => false)) rescheduleNotifications();
      }
    })();
  }, []);

  const onReady = useCallback(() => {
    if ((fontsLoaded || fontError) && theme) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError, theme]);

  if ((!fontsLoaded && !fontError) || !theme) return null;

  return (
    <ThemeProvider initial={theme}>
      <Root onReady={onReady} />
    </ThemeProvider>
  );
}

function Root({ onReady }) {
  const styles = useStyles(makeStyles);
  const { version, mode } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const navTheme = useMemo(navThemeFor, [version]);
  // סרגל הניווט של אנדרואיד (|||  ○  <) ורקע המערכת — באותו צבע כמו הערכה
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
    NavigationBar.setBackgroundColorAsync(colors.card).catch(() => {});
    NavigationBar.setButtonStyleAsync(mode === 'dark' ? 'light' : 'dark').catch(() => {});
  }, [version, mode]);
  return (
    <GestureHandlerRootView style={styles.root} onLayout={onReady}>
      <SafeAreaProvider>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <AppStateProvider>
          <View style={styles.root}>
            <NavigationContainer theme={navTheme}>
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bg },
                  animation: 'fade_from_bottom',
                }}
              >
                <Stack.Screen name="Tabs" component={Tabs} />
                <Stack.Screen name="Day" component={DayScreen} options={{ animation: 'slide_from_left' }} />
                <Stack.Screen name="WidgetEditor" component={WidgetEditorScreen} options={{ animation: 'slide_from_left' }} />
              </Stack.Navigator>
            </NavigationContainer>
            <TaskSheet />
            <DeepLinks />
            <UpdateBanner />
            <FirstRun />
          </View>
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// פתיחה ראשונה — מסך פתיחה. אחרי עדכון — "מה חדש" פעם אחת.
function FirstRun() {
  const { settings, reloadMeta } = useAppState();
  const [done, setDone] = useState(false);
  const [news, setNews] = useState(false);
  useEffect(() => {
    if (settings && settings.onboarded && settings.seenChangelog !== LATEST_CHANGES.id) setNews(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.onboarded]);
  if (!settings) return null;
  if (!settings.onboarded && !done) {
    return (
      <Onboarding
        onDone={() => {
          setDone(true);
          reloadMeta();
        }}
      />
    );
  }
  return (
    <WhatsNewSheet
      visible={news}
      onClose={() => {
        setNews(false);
        setSetting('seenChangelog', LATEST_CHANGES.id);
      }}
    />
  );
}

const makeStyles = () =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
  });
