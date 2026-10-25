// מצב ריק — איור קטן ומשפט חם, במקום מסך לבן.
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, space, text } from '../design/tokens';

export default function EmptyState({ title = 'אין משימות להיום', subtitle = 'יום פנוי. אפשר להוסיף משימה בכפתור +' }) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.wrap}>
      <Svg width={150} height={120} viewBox="0 0 150 120">
        <Circle cx="75" cy="62" r="52" fill={colors.brandSoft} />
        <Rect x="42" y="30" width="66" height="70" rx="16" fill="#FFFFFF" />
        <Rect x="54" y="46" width="30" height="7" rx="3.5" fill="#E6E8F0" />
        <Rect x="54" y="62" width="42" height="7" rx="3.5" fill="#E6E8F0" />
        <Rect x="54" y="78" width="22" height="7" rx="3.5" fill="#E6E8F0" />
        <Circle cx="108" cy="34" r="16" fill={colors.brand} />
        <Path d="M101 34.5l5 5 9-10" stroke="#FFFFFF" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="30" cy="40" r="5" fill="#FFC300" />
        <Circle cx="122" cy="92" r="4" fill="#FF4D6D" />
        <Circle cx="26" cy="90" r="3.5" fill="#10C77F" />
      </Svg>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{subtitle}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: space[10], gap: space[2] },
  title: { ...text.title, textAlign: 'center' },
  sub: { ...text.sub, textAlign: 'center' },
});
