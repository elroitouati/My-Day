// יצירה ועריכה של קטגוריה: שם + צבע מהפלטה
import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import BottomSheet from '../components/BottomSheet';
import { Button, Field, Label } from '../components/controls';
import ColorPicker from '../components/ColorPicker';
import { saveCategory, deleteCategory } from '../db/repo';
import { afterChange } from '../services/actions';
import { PALETTE, space, text } from '../design/tokens';
import { UNCATEGORIZED } from '../logic/dayItems';
import { useStyles } from '../state/Theme';

export default function CategorySheet({ category, onClose }) {
  return (
    <BottomSheet visible={!!category} onClose={onClose}>
      {category ? <Form key={category.id || 'new'} category={category} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

function Form({ category, onClose }) {
  const styles = useStyles(makeStyles);
  const [name, setName] = useState(category.name || '');
  const [color, setColor] = useState(category.id ? category.color || null : PALETTE[0]);
  const save = async () => {
    if (!name.trim()) return;
    await saveCategory({ id: category.id, name: name.trim(), color: color || '' });
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
        <View style={[styles.previewDot, { backgroundColor: color || UNCATEGORIZED.color }]} />
        <Text style={styles.previewText}>{name || 'שם הקטגוריה'}</Text>
      </View>
      <Field value={name} onChangeText={setName} placeholder="שם, למשל: עבודה" autoFocus={!category.id} />
      <Label>צבע</Label>
      <ColorPicker value={color} onChange={setColor} />
      <Button title="שמירה" icon="checkmark" onPress={save} disabled={!name.trim()} />
      {category.id ? <Button title="מחיקת קטגוריה" kind="danger" icon="trash-outline" onPress={remove} /> : null}
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  form: { gap: space[4] },
  heading: { ...text.title, textAlign: 'left' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  previewDot: { width: 16, height: 16, borderRadius: 8 },
  previewText: { ...text.heading },
});
