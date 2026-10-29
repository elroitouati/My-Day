// טוקני עיצוב — מקור אמת יחיד לצבע, טיפוגרפיה, מרווח ורדיוס.
// יש מצב בהיר ומצב כהה, וכמה ערכות צבע מותג. הגופנים והמבנה זהים בכולן.
//
// colors / text / shadow הם אובייקטים "חיים": applyTheme מעדכן אותם במקום,
// והקומפוננטות בונות סגנונות מחדש דרך useStyles (src/state/Theme.js).

// ---------------------------------------------------------------------------
//  ערכות צבע מותג
// ---------------------------------------------------------------------------
export const ACCENTS = [
  { id: 'violet', name: 'סגול', brand: '#6C5CFF', brandDeep: '#5442F5', brandDark: '#9A8CFF' },
  { id: 'orange', name: 'כתום', brand: '#FF6B2C', brandDeep: '#E5531A', brandDark: '#FF8A55' },
  { id: 'green', name: 'מנטה', brand: '#0FB57A', brandDeep: '#0A9563', brandDark: '#3DD69A' },
  { id: 'blue', name: 'אוקיינוס', brand: '#2F7BFF', brandDeep: '#1D62E0', brandDark: '#6AA2FF' },
  { id: 'pink', name: 'ורוד', brand: '#F2448C', brandDeep: '#D42E73', brandDark: '#FF74AD' },
  { id: 'teal', name: 'טורקיז', brand: '#0BA5B5', brandDeep: '#088A98', brandDark: '#3CCAD8' },
];

// סגנונות לסרגל הטאבים התחתון
export const TAB_STYLES = [
  { id: 'classic', name: 'קלאסי' },
  { id: 'floating', name: 'צף' },
  { id: 'minimal', name: 'מינימלי' },
  { id: 'bold', name: 'מודגש' },
];

const LIGHT = {
  bg: '#F5F6FA',
  card: '#FFFFFF',
  sunken: '#EEF0F6',
  line: '#E6E8F0',
  ink: '#15172B',
  ink2: '#5B6078',
  ink3: '#8E93AB',
  onBrand: '#FFFFFF',
  missed: '#E5484D',
  missedSoft: '#FDEEEE',
  success: '#12B76A',
  successSoft: '#E3F8EE',
  scrim: 'rgba(16,18,38,0.42)',
  shadow: '#1B1F3B',
  sheetScrim: '#5E6170',
};

const DARK = {
  bg: '#0F1120',
  card: '#1A1D2E',
  sunken: '#24283B',
  line: '#2E3248',
  ink: '#F1F2F8',
  ink2: '#A9AEC6',
  ink3: '#7A7F9C',
  onBrand: '#FFFFFF',
  missed: '#FF6B6F',
  missedSoft: '#3A1E26',
  success: '#3DD68C',
  successSoft: '#163527',
  scrim: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
  sheetScrim: '#05060C',
};

// ערבוב שני צבעי hex (t = כמה מהצבע השני)
function mix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x
    .map((v, i) =>
      Math.round(v + (y[i] - v) * t)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`.toUpperCase();
}

// ערכה מוכנה לפי שם, או צבע משלך (hex) מבוחר הצבעים המלא
export function accentById(id) {
  if (typeof id === 'string' && /^#[0-9A-Fa-f]{6}$/.test(id)) {
    const hex = id.toUpperCase();
    return {
      id: hex,
      name: 'צבע משלי',
      brand: hex,
      brandDeep: mix(hex, '#000000', 0.18),
      // במצב כהה מבהירים מעט צבעים כהים, כדי שיבלטו על הרקע הכהה
      brandDark: luminance(hex) < 0.25 ? mix(hex, '#FFFFFF', 0.35) : hex,
    };
  }
  return ACCENTS.find((a) => a.id === id) || ACCENTS[0];
}

function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

// הפלטה המלאה של ערכה — פונקציה טהורה (משמשת גם את הווידג'ט)
export function buildPalette(mode = 'light', accentId = 'violet') {
  const dark = mode === 'dark';
  const base = dark ? DARK : LIGHT;
  const a = accentById(accentId);
  const brand = dark ? a.brandDark : a.brand;
  return {
    ...base,
    brand,
    brandDeep: a.brandDeep,
    onBrand: onColor(brand), // טקסט על צבע המותג: לבן, או כהה על צבע בהיר (צהוב וכו')
    brandSoft: dark ? mix(base.card, brand, 0.22) : mix('#FFFFFF', brand, 0.12),
    mode: dark ? 'dark' : 'light',
  };
}

// גופנים לבחירה (כולם תומכים בעברית). scale מיישר גופנים שנראים קטנים/גדולים מהרגיל.
export const FONTS = [
  { id: 'heebo', name: 'היבו', regular: 'Heebo_400Regular', medium: 'Heebo_500Medium', bold: 'Heebo_700Bold', heavy: 'Heebo_800ExtraBold', scale: 1 },
  { id: 'rubik', name: 'רוביק', regular: 'Rubik_400Regular', medium: 'Rubik_500Medium', bold: 'Rubik_700Bold', heavy: 'Rubik_800ExtraBold', scale: 0.97 },
  {
    id: 'assistant',
    name: 'אסיסטנט',
    regular: 'Assistant_400Regular',
    medium: 'Assistant_600SemiBold',
    bold: 'Assistant_700Bold',
    heavy: 'Assistant_800ExtraBold',
    scale: 1.04,
  },
  {
    id: 'varela',
    name: 'ורלה עגול',
    regular: 'VarelaRound_400Regular',
    medium: 'VarelaRound_400Regular',
    bold: 'VarelaRound_400Regular',
    heavy: 'VarelaRound_400Regular',
    scale: 0.96,
  },
  {
    id: 'frank',
    name: 'פרנק־רוהל',
    regular: 'FrankRuhlLibre_400Regular',
    medium: 'FrankRuhlLibre_500Medium',
    bold: 'FrankRuhlLibre_700Bold',
    heavy: 'FrankRuhlLibre_900Black',
    scale: 1.05,
  },
  {
    id: 'amatic',
    name: 'כתב יד',
    regular: 'AmaticSC_400Regular',
    medium: 'AmaticSC_400Regular',
    bold: 'AmaticSC_700Bold',
    heavy: 'AmaticSC_700Bold',
    scale: 1.3,
  },
];

export const TEXT_SIZES = [
  { id: 's', name: 'קטן', scale: 0.9 },
  { id: 'm', name: 'רגיל', scale: 1 },
  { id: 'l', name: 'גדול', scale: 1.15 },
  { id: 'xl', name: 'ענק', scale: 1.3 },
];

export const DENSITIES = [
  { id: 'comfy', name: 'מרווח' },
  { id: 'compact', name: 'דחוס' },
];

export const colors = {};
export const text = {};
export const shadow = {};
export const font = {};
// מידות שמשתנות לפי הצפיפות שנבחרה
export const layout = {};
// העדפות שקוד שאינו סגנון קורא (רטט, אנימציות)
export const prefs = { motion: true, haptics: true };

let fontScale = 1;
// גודל גופן לפי גודל הטקסט והגופן שנבחרו
export const fs = (n) => Math.round(n * fontScale);

// מעדכן את הטוקנים החיים לערכה שנבחרה
export function applyTheme(t = {}) {
  const p = buildPalette(t.mode, t.accent);
  Object.keys(colors).forEach((k) => delete colors[k]);
  Object.assign(colors, p);

  const f = FONTS.find((x) => x.id === t.font) || FONTS[0];
  Object.assign(font, { regular: f.regular, medium: f.medium, bold: f.bold, heavy: f.heavy });
  fontScale = (TEXT_SIZES.find((x) => x.id === t.textSize) || TEXT_SIZES[1]).scale * f.scale;

  const compact = t.density === 'compact';
  Object.assign(layout, {
    compact,
    cardPadV: compact ? 9 : 16,
    cardMinH: compact ? 56 : 76,
    cardGap: compact ? 8 : 12,
    check: compact ? 32 : 38,
    sectionGap: compact ? 8 : 12,
  });
  prefs.motion = t.motion !== false;
  prefs.haptics = t.haptics !== false;

  Object.assign(shadow, {
    card: {
      shadowColor: colors.shadow,
      shadowOpacity: p.mode === 'dark' ? 0.4 : 0.07,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: p.mode === 'dark' ? 0 : 2,
    },
    float: {
      shadowColor: colors.brandDeep,
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
  });
  const tx = (family, size, lh, color) => ({ fontFamily: family, fontSize: fs(size), lineHeight: fs(lh), color });
  Object.assign(text, {
    hero: tx(font.heavy, 32, 40, colors.ink),
    title: tx(font.bold, 22, 30, colors.ink),
    heading: tx(font.bold, 17, 24, colors.ink),
    body: tx(font.medium, 16, 23, colors.ink),
    sub: tx(font.regular, 14, 20, colors.ink2),
    caption: tx(font.medium, 12, 16, colors.ink3),
  });
}

applyTheme({});

// צבע הכוכב של משימה חשובה
export const STAR = '#F5A623';

// פלטת צבעים חיים לקטגוריות
export const PALETTE = ['#FF4D6D', '#FF8A00', '#FFC300', '#10C77F', '#00B8D9', '#3A86FF', '#6C5CFF', '#8B5CF6', '#FF4FBF', '#7CB518', '#FF6B3D', '#14B8A6'];

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 };

export const radius = { sm: 12, md: 18, card: 24, sheet: 32, pill: 999 };

// צבע טקסט קריא מעל צבע רקע נתון
export function onColor(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 170 ? '#15172B' : '#FFFFFF';
}

// צבע שקוף-למחצה מתוך hex
export function tint(hex, alpha) {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex.slice(0, 7)}${a}`;
}
