import React, { useCallback, useEffect } from 'react';
import { I18nManager, StyleSheet, View, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, Heebo_400Regular, Heebo_500Medium, Heebo_700Bold, Heebo_800ExtraBold } from '@expo-google-fonts/heebo';

import { AppStateProvider, useAppState } from './src/state/AppState';
import TabBar from './src/components/TabBar';
import TaskSheet from './src/sheets/TaskSheet';
import TodayScreen from './src/screens/TodayScreen';
import WeekScreen from './src/screens/WeekScreen';
import MonthScreen from './src/screens/MonthScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DayScreen from './src/screens/DayScreen';
import { registerBackgroundTask } from './src/services/background';
import { setupNotifications, requestNotificationPermission, rescheduleNotifications } from './src/services/notifications';
import { getSettings, setSetting } from './src/db/repo';
import { colors } from './src/design/tokens';

// RTL מלא בכל מסך. תוסף ה-config (plugins/withForceRTL) מפעיל אותו כבר בהפעלה הראשונה.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
SplashScreen.preventAutoHideAsync().catch(() => {});

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.card, primary: colors.brand, text: colors.ink, border: colors.line },
};

function Tabs() {
  return (
    <Tab.Navigator tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
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
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Heebo_400Regular, Heebo_500Medium, Heebo_700Bold, Heebo_800ExtraBold });

  useEffect(() => {
    (async () => {
      await setupNotifications().catch(() => {});
      registerBackgroundTask();
      // בפתיחה הראשונה בלבד — בקשת הרשאת התראות (אנדרואיד 13+)
      const s = await getSettings();
      if (!s.askedNotifications) {
        await setSetting('askedNotifications', true);
        if (await requestNotificationPermission().catch(() => false)) rescheduleNotifications();
      }
    })();
  }, []);

  const onReady = useCallback(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onReady}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AppStateProvider>
          <View style={styles.root}>
            <NavigationContainer theme={navTheme}>
              <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade_from_bottom' }}>
                <Stack.Screen name="Tabs" component={Tabs} />
                <Stack.Screen name="Day" component={DayScreen} options={{ animation: 'slide_from_left' }} />
              </Stack.Navigator>
            </NavigationContainer>
            <TaskSheet />
            <DeepLinks />
          </View>
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
