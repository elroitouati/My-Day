// עורך הווידג'ט: תצוגה מקדימה חיה למעלה, וכל אפשרויות העיצוב, התוכן וההתנהגות מתחת.
// כל שינוי נשמר מיד ומתעדכן גם בווידג'ט שעל מסך הבית.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WidgetPreview } from "react-native-android-widget";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { MyDayWidget, sampleItems } from "../widget/MyDayWidget";
import { widgetData, refreshWidget } from "../widget/update";
import { WIDGET_DEFAULTS } from "../widget/prefs";
import { playCheckSound } from "../widget/feedback";
import { Group, Row, Toggle, Chips, Button } from "../components/controls";
import ColorPicker from "../components/ColorPicker";
import { setSetting } from "../db/repo";
import { useAppState } from "../state/AppState";
import { useStyles } from "../state/Theme";
import { haptic } from "../design/feedback";
import { colors, space, text, font, radius, shadow } from "../design/tokens";

const SIZES = [
  { value: "small", label: "קטן", w: 300, h: 170 },
  { value: "medium", label: "בינוני", w: 320, h: 250 },
  { value: "large", label: "גדול", w: 320, h: 360 },
];

export default function WidgetEditorScreen({ navigation }) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const { version } = useAppState();
  const [prefs, setPrefs] = useState(null);
  const [data, setData] = useState(null);
  const [size, setSize] = useState("medium");
  const [sample, setSample] = useState(false);

  // טעינת ההעדפות השמורות
  useEffect(() => {
    widgetData().then((d) => {
      setPrefs(d.prefs);
      setData(d);
    });
  }, []);

  // נתונים לתצוגה המקדימה — מתעדכנים בכל שינוי
  useEffect(() => {
    if (!prefs) return;
    widgetData(prefs)
      .then(setData)
      .catch(() => {});
  }, [prefs, version]);

  const set = useCallback((patch) => {
    haptic.tap();
    setPrefs((p) => ({ ...p, ...patch }));
    Promise.all(
      Object.entries(patch).map(([k, v]) => setSetting(`widget_${k}`, v)),
    )
      .then(() => refreshWidget())
      .catch(() => {});
  }, []);

  const preview = useMemo(() => {
    if (!data || !prefs) return null;
    if (!sample) return data;
    const items = sampleItems(data.today);
    return {
      ...data,
      dateKey: data.today,
      isTomorrow: false,
      items,
      mode: "list",
      stats: { total: 4, done: 1, ratio: 0.25 },
    };
  }, [data, prefs, sample]);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (res.canceled || !res.assets?.length) return;
    // מקטינים ושומרים עותק בתיקיית האפליקציה — הווידג'ט קורא אותו משם
    const small = await ImageManipulator.manipulateAsync(
      res.assets[0].uri,
      [{ resize: { width: 900 } }],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    const dest = `${FileSystem.documentDirectory}widget-bg-${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: small.uri, to: dest });
    if (prefs.image)
      FileSystem.deleteAsync(prefs.image, { idempotent: true }).catch(() => {});
    set({ bg: "image", image: dest });
  };

  const reset = () =>
    Alert.alert("לאפס את עיצוב הווידג׳ט?", "כל ההגדרות יחזרו לברירת המחדל.", [
      { text: "ביטול", style: "cancel" },
      {
        text: "איפוס",
        style: "destructive",
        onPress: () => set({ ...WIDGET_DEFAULTS }),
      },
    ]);

  if (!prefs || !preview)
    return <View style={[styles.root, { paddingTop: insets.top }]} />;

  const sz = SIZES.find((s) => s.value === size);
  const scale = Math.min(1, (screenW - 32) / sz.w);
  const imageBg = prefs.bg === "image";

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.back}
          accessibilityLabel="חזרה"
        >
          <Ionicons name="arrow-forward" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>עיצוב הווידג'ט</Text>
      </View>

      {/* תצוגה מקדימה — קבועה למעלה, כמו על מסך הבית */}
      <View style={styles.stage}>
        <View
          style={{
            width: sz.w * scale,
            height: sz.h * scale,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ transform: [{ scale }] }}>
            <WidgetPreview
              key={`${size}-${version}`}
              width={sz.w}
              height={sz.h}
              renderWidget={({ width, height }) => (
                <MyDayWidget
                  {...preview}
                  prefs={prefs}
                  width={width}
                  height={height}
                />
              )}
            />
          </View>
        </View>
        <View style={styles.stageBar}>
          <Chips options={SIZES} value={size} onChange={setSize} />
          <Pressable
            onPress={() => setSample((v) => !v)}
            style={[styles.sampleBtn, sample && styles.sampleOn]}
          >
            <Text style={[styles.sampleText, sample && styles.sampleTextOn]}>
              {sample ? "דוגמה" : "המשימות שלי"}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Section title="רקע">
          <Chips
            options={[
              { value: "solid", label: "צבע הערכה" },
              { value: "color", label: "צבע משלי" },
              { value: "none", label: "בלי רקע" },
              { value: "image", label: "תמונה" },
            ]}
            value={prefs.bg}
            onChange={(v) =>
              v === "image" && !prefs.image ? pickImage() : set({ bg: v })
            }
          />
          {prefs.bg === "color" ? (
            <ColorPicker
              value={prefs.bgColor}
              onChange={(c) => set({ bgColor: c })}
              allowNone={false}
            />
          ) : null}
          {imageBg ? (
            <>
              <Button
                title={prefs.image ? "החלפת התמונה" : "בחירת תמונה"}
                kind="soft"
                icon="image-outline"
                onPress={pickImage}
              />
              <Label>הכהיית התמונה (כדי שהטקסט ייקרא)</Label>
              <Chips
                options={[0, 15, 35, 55, 70].map((v) => ({
                  value: v,
                  label: v ? `${v}%` : "בלי",
                }))}
                value={prefs.imageDim}
                onChange={(v) => set({ imageDim: v })}
              />
            </>
          ) : null}
          {prefs.bg === "solid" || prefs.bg === "color" ? (
            <>
              <Label>שקיפות הרקע</Label>
              <Chips
                options={[100, 85, 70, 50, 30].map((v) => ({
                  value: v,
                  label: v === 100 ? "אטום" : `${v}%`,
                }))}
                value={prefs.opacity}
                onChange={(v) => set({ opacity: v })}
              />
            </>
          ) : null}
        </Section>

        <Section title="צבעים וטקסט">
          <Label>ערכת צבעים</Label>
          <Chips
            options={[
              { value: "app", label: "כמו האפליקציה" },
              { value: "light", label: "בהיר" },
              { value: "dark", label: "כהה" },
            ]}
            value={prefs.theme}
            onChange={(v) => set({ theme: v })}
          />
          <Label>צבע הטקסט</Label>
          <Chips
            options={[
              { value: "auto", label: "אוטומטי" },
              { value: "light", label: "לבן" },
              { value: "dark", label: "כהה" },
            ]}
            value={prefs.textColor}
            onChange={(v) => set({ textColor: v })}
          />
          <Label>גודל טקסט</Label>
          <Chips
            options={[
              { value: "s", label: "קטן" },
              { value: "m", label: "רגיל" },
              { value: "l", label: "גדול" },
            ]}
            value={prefs.textSize}
            onChange={(v) => set({ textSize: v })}
          />
          <Label>שורות</Label>
          <Chips
            options={[
              { value: "comfy", label: "מרווחות" },
              { value: "compact", label: "צפופות" },
            ]}
            value={prefs.rows}
            onChange={(v) => set({ rows: v })}
          />
          <Label>פינות</Label>
          <Chips
            options={[
              { value: 0, label: "ישרות" },
              { value: 12, label: "מעט" },
              { value: 24, label: "עגולות" },
              { value: 36, label: "מאוד" },
            ]}
            value={prefs.radius}
            onChange={(v) => set({ radius: v })}
          />
        </Section>

        <Section title="מה מוצג">
          <Group>
            <Row
              icon="text-outline"
              title="כותרת (My Day)"
              trailing={
                <Toggle
                  value={prefs.showHeader}
                  onValueChange={(v) => set({ showHeader: v })}
                />
              }
            />
            <Row
              icon="remove-outline"
              title="פס התקדמות"
              trailing={
                <Toggle
                  value={prefs.showProgress}
                  onValueChange={(v) => set({ showProgress: v })}
                />
              }
            />
            <Row
              icon="pie-chart-outline"
              title="מונה (2/5)"
              trailing={
                <Toggle
                  value={prefs.showCounter}
                  onValueChange={(v) => set({ showCounter: v })}
                />
              }
            />
            <Row
              icon="add-circle-outline"
              title="כפתור +"
              trailing={
                <Toggle
                  value={prefs.showAdd}
                  onValueChange={(v) => set({ showAdd: v })}
                />
              }
            />
            <Row
              icon="time-outline"
              title="שעה בכל משימה"
              trailing={
                <Toggle
                  value={prefs.showTime}
                  onValueChange={(v) => set({ showTime: v })}
                />
              }
            />
            <Row
              icon="pricetag-outline"
              title="קטגוריה בכל משימה"
              trailing={
                <Toggle
                  value={prefs.showCategory}
                  onValueChange={(v) => set({ showCategory: v })}
                />
              }
            />
            <Row
              icon="checkmark-done-outline"
              title="משימות שבוצעו"
              trailing={
                <Toggle
                  value={prefs.showDone}
                  onValueChange={(v) => set({ showDone: v })}
                />
              }
            />
            <Row
              icon="calendar-outline"
              title="אירועי יומן"
              trailing={
                <Toggle
                  value={prefs.showCalendar}
                  onValueChange={(v) => set({ showCalendar: v })}
                />
              }
            />
            <Row
              icon="barbell-outline"
              title='אימוני פנמ"צ'
              trailing={
                <Toggle
                  value={prefs.showPanmatz}
                  onValueChange={(v) => set({ showPanmatz: v })}
                />
              }
            />
          </Group>
          <Label>תאריך בכותרת</Label>
          <Chips
            options={[
              { value: "full", label: "מלא" },
              { value: "short", label: "רק היום בשבוע" },
              { value: "none", label: "בלי" },
            ]}
            value={prefs.dateStyle}
            onChange={(v) => set({ dateStyle: v })}
          />
          <Label>כמה משימות להציג</Label>
          <Chips
            options={[
              { value: 0, label: "הכל" },
              { value: 3, label: "3" },
              { value: 5, label: "5" },
              { value: 8, label: "8" },
            ]}
            value={prefs.maxItems}
            onChange={(v) => set({ maxItems: v })}
          />
        </Section>

        <Section title="התנהגות">
          <Row
            icon="phone-portrait-outline"
            title="רטט כשמסמנים V"
            trailing={
              <Toggle
                value={prefs.haptic}
                onValueChange={(v) => set({ haptic: v })}
              />
            }
          />
          <Row
            icon="musical-note-outline"
            title="צליל כשמסמנים V"
            trailing={
              <Toggle
                value={prefs.sound}
                onValueChange={(v) => {
                  set({ sound: v });
                  if (v) playCheckSound();
                }}
              />
            }
          />
          <Label>גודל</Label>
          <Chips
            options={[
              { value: "fill", label: "ממלא את כל המקום" },
              { value: "content", label: "מתכווץ לפי התוכן" },
            ]}
            value={prefs.fit}
            onChange={(v) => set({ fit: v })}
          />
          <Text style={styles.hint}>
            את גודל המסגרת של הווידג'ט קובעים במסך הבית (לחיצה ארוכה ומשיכה).
            "מתכווץ" מצייר רק את מה שצריך, והשאר שקוף. עם תמונת רקע הווידג'ט
            תמיד ממלא את המקום.
          </Text>
          <Label>כשאין משימות היום</Label>
          <Chips
            options={[
              { value: "message", label: "הודעה" },
              { value: "tomorrow", label: "להציג את מחר" },
              { value: "hide", label: "להעלים" },
            ]}
            value={prefs.whenEmpty}
            onChange={(v) => set({ whenEmpty: v })}
          />
          <Label>כשהכל הושלם</Label>
          <Chips
            options={[
              { value: "message", label: "להשאיר" },
              { value: "tomorrow", label: "להציג את מחר" },
              { value: "hide", label: "להעלים" },
            ]}
            value={prefs.whenAllDone}
            onChange={(v) => set({ whenAllDone: v })}
          />
          <Text style={styles.hint}>
            "להעלים" — הווידג'ט נעשה שקוף לגמרי, וחוזר לבד כשיש משימות. אנדרואיד
            לא מאפשר לאפליקציה להסיר אותו ממסך הבית, ונגיעה במקום שלו פותחת את
            האפליקציה.
          </Text>
        </Section>

        <Button
          title="איפוס לברירת המחדל"
          kind="ghost"
          icon="refresh"
          onPress={reset}
        />
      </ScrollView>
    </View>
  );
}

function Section({ title, children }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Label({ children }) {
  const styles = useStyles(makeStyles);
  return <Text style={styles.label}>{children}</Text>;
}

const makeStyles = () =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[3],
      paddingHorizontal: space[4],
      paddingTop: space[3],
      paddingBottom: space[2],
    },
    back: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { ...text.title, flex: 1, textAlign: "left" },
    stage: {
      marginHorizontal: space[4],
      padding: space[3],
      borderRadius: radius.card,
      backgroundColor: colors.mode === "dark" ? "#2A3550" : "#9FB3D1", // "טפט" כדי לראות שקיפות ורקע
      alignItems: "center",
      gap: space[3],
      ...shadow.card,
    },
    stageBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: space[2],
      flexWrap: "wrap",
      justifyContent: "center",
    },
    sampleBtn: {
      height: 38,
      paddingHorizontal: 14,
      borderRadius: 19,
      backgroundColor: colors.card,
      justifyContent: "center",
    },
    sampleOn: { backgroundColor: colors.brand },
    sampleText: { fontFamily: font.bold, fontSize: 14, color: colors.ink2 },
    sampleTextOn: { color: colors.onBrand },
    content: { padding: space[4], gap: space[5], paddingBottom: 60 },
    section: { gap: space[2] },
    sectionTitle: {
      ...text.heading,
      textAlign: "left",
      paddingHorizontal: space[1],
    },
    sectionBody: {
      backgroundColor: colors.card,
      borderRadius: radius.card,
      padding: space[4],
      gap: space[3],
    },
    label: {
      ...text.caption,
      fontFamily: font.bold,
      color: colors.ink2,
      textAlign: "left",
    },
    hint: { ...text.caption, textAlign: "left" },
  });
