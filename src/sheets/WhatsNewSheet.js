// "מה חדש": מה נכנס בעדכון האחרון (ובקודמים, בגלילה)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../components/BottomSheet';
import { Button } from '../components/controls';
import { CHANGELOG } from '../changelog';
import { colors, space, text, font, fs } from '../design/tokens';
import { useStyles } from '../state/Theme';

export default function WhatsNewSheet({ visible, onClose, all = false }) {
  const styles = useStyles(makeStyles);
  const entries = all ? CHANGELOG : CHANGELOG.slice(0, 1);
  return (
    <BottomSheet visible={visible} onClose={onClose} footer={<Button title="מעולה" onPress={onClose} />}>
      <View style={styles.head}>
        <View style={styles.badge}>
          <Ionicons name="sparkles" size={26} color={colors.onBrand} />
        </View>
        <Text style={styles.title}>מה חדש ב-My Day</Text>
      </View>
      {entries.map((e, i) => (
        <View key={e.id} style={[styles.entry, i > 0 && styles.entryOld]}>
          <Text style={styles.entryTitle}>{e.title}</Text>
          {e.items.map((it) => (
            <View key={it} style={styles.item}>
              <Ionicons name="checkmark-circle" size={18} color={i === 0 ? colors.brand : colors.ink3} />
              <Text style={styles.itemText}>{it}</Text>
            </View>
          ))}
        </View>
      ))}
    </BottomSheet>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    head: { alignItems: 'center', gap: space[3], marginBottom: space[4] },
    badge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { ...text.title, textAlign: 'center' },
    entry: { gap: space[2], marginBottom: space[4] },
    entryOld: { opacity: 0.7 },
    entryTitle: { ...text.heading, textAlign: 'left' },
    item: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
    itemText: {
      ...text.body,
      fontSize: fs(15),
      flex: 1,
      textAlign: 'left',
      fontFamily: font.medium,
    },
  });
