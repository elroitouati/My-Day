// טוקני עיצוב — מקור אמת יחיד לצבע, טיפוגרפיה, מרווח ורדיוס.
// בהיר ונקי. צבע מותג אחד (סגול חשמלי), כל השאר מגיע מצבעי הקטגוריות.

export const colors = {
  bg: '#F5F6FA',
  card: '#FFFFFF',
  sunken: '#EEF0F6',
  line: '#E6E8F0',
  ink: '#15172B',
  ink2: '#5B6078',
  ink3: '#9A9FB5',
  brand: '#6C5CFF',
  brandDeep: '#5442F5',
  brandSoft: '#EEEBFF',
  onBrand: '#FFFFFF',
  missed: '#E5484D',
  missedSoft: '#FDEEEE',
  success: '#12B76A',
  scrim: 'rgba(16,18,38,0.42)',
  shadow: '#1B1F3B',
};

// פלטת צבעים חיים לקטגוריות
export const PALETTE = [
  '#FF4D6D', '#FF8A00', '#FFC300', '#10C77F', '#00B8D9',
  '#3A86FF', '#6C5CFF', '#8B5CF6', '#FF4FBF', '#7CB518',
  '#FF6B3D', '#14B8A6',
];

export const font = {
  regular: 'Heebo_400Regular',
  medium: 'Heebo_500Medium',
  bold: 'Heebo_700Bold',
  heavy: 'Heebo_800ExtraBold',
};

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 };

export const radius = { sm: 12, md: 18, card: 24, sheet: 32, pill: 999 };

export const shadow = {
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  float: {
    shadowColor: colors.brandDeep,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

export const text = {
  hero: { fontFamily: font.heavy, fontSize: 32, lineHeight: 40, color: colors.ink },
  title: { fontFamily: font.bold, fontSize: 22, lineHeight: 30, color: colors.ink },
  heading: { fontFamily: font.bold, fontSize: 17, lineHeight: 24, color: colors.ink },
  body: { fontFamily: font.medium, fontSize: 16, lineHeight: 23, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.ink2 },
  caption: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: colors.ink3 },
};

// צבע טקסט קריא מעל צבע רקע נתון
export function onColor(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 170 ? colors.ink : '#FFFFFF';
}

// צבע שקוף-למחצה מתוך hex
export function tint(hex, alpha) {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex.slice(0, 7)}${a}`;
}
