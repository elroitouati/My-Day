// יצירה ועריכה של קטגוריה: שם + צבע מהפלטה
import React, { useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../components/BottomSheet';
import { Button, Field, Label } from '../components/controls';
import { saveCategory, deleteCategory } from '../db/repo';
import { afterChange } from '../services/actions';
import { PALETTE, colors, space, text } from '../design/tokens';

export default function CategorySheet({ category, onClose }) {
  return (
    <BottomSheet visible={!!category} onClose={onClose}>
      {category ? <Form key={category.id || 'new'} category={category} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

function Form({ category, onClose }) {
  const [name, setName] = useState(category.name || '');
  const [color, setColor] = useState(category.color || PALETTE[0]);
  const save = async () => {
    if (!name.trim()) return;
    await saveCategory({ id: category.id, name: name.trim(), color });
    await afterChange();
    onClose();
  };
  const remove = () =>
    Alert.alert('למחוק את הקטגוריה?', 'המשימות שלה יישארו, בקטגוריה "כללי".', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחיקה',
        style: 'destructive',
        onPress: async () => {
          await deleteCategory(category.id);
          await afterChange();
          onClose();
        },
      },
    ]);
  return (
    <View style={styles.form}>
      <Text style={styles.heading}>{category.id ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}</Text>
      <View style={styles.preview}>
        <View style={[styles.previewDot, { backgroundColor: color }]} />
        <Text style={styles.previewText}>{name || 'שם הקטגוריה'}</Text>
      </View>
      <Field value={name} onChangeText={setName} placeholder="שם, למשל: עבודה" autoFocus={!category.id} />
      <Label>צבע</Label>
      <View style={styles.palette}>
        {PALETTE.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: color === c }}
            accessibilityLabel={`צבע ${c}`}
          >
            {color === c ? <Ionicons name="checkmark" size={22} color="#FFFFFF" /> : null}
          </Pressable>
        ))}
      </View>
      <Button title="שמירה" icon="checkmark" onPress={save} disabled={!name.trim()} />
      {category.id ? <Button title="מחיקת קטגוריה" kind="danger" icon="trash-outline" onPress={remove} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space[4] },
  heading: { ...text.title, textAlign: 'left' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  previewDot: { width: 16, height: 16, borderRadius: 8 },
  previewText: { ...text.heading },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  swatch: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  swatchOn: { borderWidth: 3, borderColor: colors.card, transform: [{ scale: 1.08 }], elevation: 4 },
});
