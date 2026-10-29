// בוחר צבעים מלא: ריבוע רוויה/בהירות + פס גוונים, ומתחתם צבעים מהירים ו"בלי צבע".
// הצבעים המהירים תמיד גלויים; הבוחר המלא נפתח בכפתור "צבע משלך". כולו JS (react-native-svg).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, Text, StyleSheet, PanResponder } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { PALETTE, colors, radius, space, text, font } from '../design/tokens';
import { useStyles } from '../state/Theme';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function hsvToHex(h, s, v) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const hex = (x) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${hex(f(5))}${hex(f(3))}${hex(f(1))}`.toUpperCase();
}

export function hexToHsv(hex) {
  const n = parseInt(hex.slice(1, 7), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

const HUES = [0, 60, 120, 180, 240, 300, 360];

// גרירה עם PanResponder: כשהאצבע בתוך הבוחר, הגלילה של המסך לא "גונבת" את התנועה
function useDrag(onMove, onEnd) {
  const ref = useRef({ onMove, onEnd });
  ref.current = { onMove, onEnd };
  return useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => ref.current.onMove(e.nativeEvent.locationX, e.nativeEvent.locationY),
        onPanResponderMove: (e) => ref.current.onMove(e.nativeEvent.locationX, e.nativeEvent.locationY),
        onPanResponderRelease: () => ref.current.onEnd(),
        onPanResponderTerminate: () => ref.current.onEnd(),
      }).panHandlers,
    []
  );
}

export default function ColorPicker({ value, onChange, allowNone = true, startOpen = false }) {
  const styles = useStyles(makeStyles);
  const [hsv, setHsv] = useState(() => (value ? hexToHsv(value) : { h: 250, s: 0.65, v: 1 }));
  const [box, setBox] = useState({ w: 1, h: 1 });
  const [bar, setBar] = useState(1);
  const inPalette = !!value && PALETTE.some((c) => c.toUpperCase() === value.toUpperCase());
  const [open, setOpen] = useState(startOpen);
  const live = useRef(hsv);

  useEffect(() => {
    if (value && value.toUpperCase() !== hsvToHex(hsv.h, hsv.s, hsv.v)) {
      const next = hexToHsv(value);
      live.current = next;
      setHsv(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // בזמן גרירה מתעדכן רק הבוחר עצמו; הצבע נשמר כשמרימים את האצבע — בלי הבהובים במסך
  const move = (next) => {
    live.current = next;
    setHsv(next);
  };
  const commit = () => {
    const c = live.current;
    const hex = hsvToHex(c.h, c.s, c.v);
    if (!value || hex !== value.toUpperCase()) onChange(hex);
  };

  const boxDrag = useDrag((x, y) => move({ ...live.current, s: clamp(x / box.w, 0, 1), v: clamp(1 - y / box.h, 0, 1) }), commit);
  const hueDrag = useDrag((x) => move({ ...live.current, h: clamp((x / bar) * 360, 0, 359.9) }), commit);

  const pure = hsvToHex(hsv.h, 1, 1);
  const current = hsvToHex(hsv.h, hsv.s, hsv.v);
  const customOn = !!value && !inPalette;

  return (
    <View style={styles.wrap}>
      <View style={styles.swatches}>
        {allowNone ? (
          <Pressable onPress={() => onChange(null)} style={[styles.swatch, styles.none, !value && styles.swatchOn]} accessibilityLabel="בלי צבע">
            <Ionicons name="ban-outline" size={20} color={colors.ink3} />
          </Pressable>
        ) : null}
        {PALETTE.map((c) => (
          <Pressable
            key={c}
            onPress={() => {
              const next = hexToHsv(c);
              live.current = next;
              setHsv(next);
              onChange(c);
            }}
            style={[styles.swatch, { backgroundColor: c }, value && value.toUpperCase() === c.toUpperCase() && styles.swatchOn]}
            accessibilityLabel={`צבע ${c}`}
          />
        ))}
      </View>

      <Pressable onPress={() => setOpen((o) => !o)} style={[styles.customBtn, (open || customOn) && styles.customBtnOn]} accessibilityRole="button">
        <View style={[styles.customDot, { backgroundColor: customOn || open ? current : colors.sunken }]}>
          {customOn || open ? null : <Ionicons name="color-palette" size={16} color={colors.brand} />}
        </View>
        <Text style={styles.customText}>{open ? 'סגירת הצבע המותאם' : customOn ? `צבע משלך · ${current}` : 'צבע משלך'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.ink2} />
      </Pressable>

      {open ? (
        // direction: ltr — הקואורדינטות של המגע והציור פיזיות, גם כשהאפליקציה ב-RTL
        <View style={styles.ltr}>
          <View style={styles.box} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} {...boxDrag}>
            <Svg width="100%" height="100%" pointerEvents="none">
              <Defs>
                <LinearGradient id="white" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
                  <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </LinearGradient>
                <LinearGradient id="black" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                  <Stop offset="1" stopColor="#000000" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill={pure} />
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#white)" />
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#black)" />
            </Svg>
            <View pointerEvents="none" style={[styles.thumb, { left: hsv.s * box.w - 12, top: (1 - hsv.v) * box.h - 12, backgroundColor: current }]} />
          </View>

          <View style={styles.hue} onLayout={(e) => setBar(e.nativeEvent.layout.width)} {...hueDrag}>
            <Svg width="100%" height="100%" pointerEvents="none">
              <Defs>
                <LinearGradient id="hue" x1="0" y1="0" x2="1" y2="0">
                  {HUES.map((h) => (
                    <Stop key={h} offset={String(h / 360)} stopColor={hsvToHex(h % 360, 1, 1)} />
                  ))}
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" rx="14" fill="url(#hue)" />
            </Svg>
            <View pointerEvents="none" style={[styles.hueThumb, { left: (hsv.h / 360) * bar - 12, backgroundColor: pure }]} />
          </View>
          <Text style={styles.caption}>גוררים בריבוע ובפס — הצבע נשמר כשמרימים את האצבע</Text>
        </View>
      ) : null}
      {!value ? <Text style={styles.caption}>בלי צבע — המשימות יוצגו באפור</Text> : null}
    </View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    wrap: { gap: space[3] },
    ltr: { direction: 'ltr', gap: space[3] },
    box: { height: 160, borderRadius: radius.md, overflow: 'hidden' },
    thumb: { position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: '#FFFFFF', elevation: 3 },
    hue: { height: 28, justifyContent: 'center' },
    hueThumb: { position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: '#FFFFFF', elevation: 3 },
    swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    swatch: { width: 34, height: 34, borderRadius: 17 },
    none: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
    swatchOn: { borderWidth: 3, borderColor: colors.ink, transform: [{ scale: 1.1 }] },
    caption: { ...text.caption, fontFamily: font.medium, textAlign: 'left' },
    customBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      backgroundColor: colors.sunken,
      borderRadius: radius.md,
      paddingHorizontal: space[3],
      height: 46,
    },
    customBtnOn: { borderWidth: 1.5, borderColor: colors.brand },
    customDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.card },
    customText: { flex: 1, fontFamily: font.bold, fontSize: 14, color: colors.ink, textAlign: 'left' },
  });
