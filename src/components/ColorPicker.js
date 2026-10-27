// בוחר צבעים מלא: ריבוע רוויה/בהירות + פס גוונים, ומתחתם צבעים מהירים ו"בלי צבע".
// כולו JS (react-native-svg + gesture-handler) — בלי ספרייה נייטיב נוספת.
import React, { useEffect, useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { PALETTE, colors, radius, space, text, font } from '../design/tokens';
import { useStyles } from '../state/Theme';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function hsvToHex(h, s, v) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const hex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
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

export default function ColorPicker({ value, onChange, allowNone = true }) {
  const styles = useStyles(makeStyles);
  const [hsv, setHsv] = useState(() => (value ? hexToHsv(value) : { h: 250, s: 0.65, v: 1 }));
  const [box, setBox] = useState({ w: 1, h: 1 });
  const [bar, setBar] = useState(1);

  useEffect(() => {
    if (value && value.toUpperCase() !== hsvToHex(hsv.h, hsv.s, hsv.v)) setHsv(hexToHsv(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const apply = (next) => {
    setHsv(next);
    onChange(hsvToHex(next.h, next.s, next.v));
  };

  const pickBox = (x, y) => apply({ ...hsv, s: clamp(x / box.w, 0, 1), v: clamp(1 - y / box.h, 0, 1) });
  const pickHue = (x) => apply({ ...hsv, h: clamp((x / bar) * 360, 0, 359.9) });

  const boxGesture = Gesture.Pan().minDistance(0).runOnJS(true)
    .onBegin((e) => pickBox(e.x, e.y))
    .onUpdate((e) => pickBox(e.x, e.y));
  const hueGesture = Gesture.Pan().minDistance(0).runOnJS(true)
    .onBegin((e) => pickHue(e.x))
    .onUpdate((e) => pickHue(e.x));

  const pure = hsvToHex(hsv.h, 1, 1);
  const current = value ? hsvToHex(hsv.h, hsv.s, hsv.v) : null;

  return (
    // direction: ltr — הקואורדינטות של המגע והציור פיזיות, גם כשהאפליקציה ב-RTL
    <View style={styles.wrap}>
      <View style={styles.ltr}>
        <GestureDetector gesture={boxGesture}>
          <View style={styles.box} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            <Svg width="100%" height="100%">
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
            {current ? (
              <View pointerEvents="none" style={[styles.thumb, { left: hsv.s * box.w - 12, top: (1 - hsv.v) * box.h - 12, backgroundColor: current }]} />
            ) : null}
          </View>
        </GestureDetector>

        <GestureDetector gesture={hueGesture}>
          <View style={styles.hue} onLayout={(e) => setBar(e.nativeEvent.layout.width)}>
            <Svg width="100%" height="100%">
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
        </GestureDetector>
      </View>

      <View style={styles.swatches}>
        {allowNone ? (
          <Pressable
            onPress={() => onChange(null)}
            style={[styles.swatch, styles.none, !value && styles.swatchOn]}
            accessibilityLabel="בלי צבע"
          >
            <Ionicons name="ban-outline" size={20} color={colors.ink3} />
          </Pressable>
        ) : null}
        {PALETTE.map((c) => (
          <Pressable
            key={c}
            onPress={() => {
              setHsv(hexToHsv(c));
              onChange(c);
            }}
            style={[styles.swatch, { backgroundColor: c }, value && value.toUpperCase() === c.toUpperCase() && styles.swatchOn]}
            accessibilityLabel={`צבע ${c}`}
          />
        ))}
      </View>
      <Text style={styles.caption}>{value ? 'גוררים בריבוע ובפס כדי לבחור כל גוון' : 'בלי צבע — המשימות יוצגו באפור'}</Text>
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
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
});

