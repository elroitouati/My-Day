import { buildPalette, applyTheme, colors, text, ACCENTS } from '../src/design/tokens';

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

test.each(['light', 'dark'])('%s: body text is readable on cards and background', (mode) => {
  ACCENTS.forEach((a) => {
    const p = buildPalette(mode, a.id);
    expect(contrast(p.ink, p.card)).toBeGreaterThan(7);
    expect(contrast(p.ink2, p.card)).toBeGreaterThan(4.5);
    expect(contrast(p.ink, p.bg)).toBeGreaterThan(7);
  });
});

test('applyTheme updates the live tokens in place', () => {
  applyTheme('dark', 'orange');
  expect(colors.mode).toBe('dark');
  expect(colors.brand).toBe(ACCENTS.find((a) => a.id === 'orange').brandDark);
  expect(text.body.color).toBe(colors.ink);
  applyTheme('light', 'violet');
  expect(colors.bg).toBe('#F5F6FA');
});
