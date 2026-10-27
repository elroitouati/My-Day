import { hsvToHex, hexToHsv } from '../src/components/ColorPicker';

test('basic hues', () => {
  expect(hsvToHex(0, 1, 1)).toBe('#FF0000');
  expect(hsvToHex(120, 1, 1)).toBe('#00FF00');
  expect(hsvToHex(240, 1, 1)).toBe('#0000FF');
  expect(hsvToHex(0, 0, 1)).toBe('#FFFFFF');
  expect(hsvToHex(0, 0, 0)).toBe('#000000');
});

test('round trip for the palette colors', () => {
  ['#6C5CFF', '#FF4D6D', '#10C77F', '#FFC300', '#14B8A6'].forEach((hex) => {
    const { h, s, v } = hexToHsv(hex);
    expect(hsvToHex(h, s, v)).toBe(hex);
  });
});
