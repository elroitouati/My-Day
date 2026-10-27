import { arrangeItems, inQuietHours } from '../src/logic/arrange';

const it_ = (uid, done = false) => ({ uid, done });
const items = [it_('a'), it_('b', true), it_('c'), it_('d', true)];
const uids = (l) => l.map((i) => i.uid).join('');

describe('arrangeItems', () => {
  test('auto keeps the given order', () => expect(uids(arrangeItems(items))).toBe('abcd'));
  test('done items to the bottom', () => expect(uids(arrangeItems(items, { doneItems: 'bottom' }))).toBe('acbd'));
  test('hide done items', () => expect(uids(arrangeItems(items, { doneItems: 'hide' }))).toBe('ac'));
  test('manual order, new items appended', () => {
    expect(uids(arrangeItems(items, { sortMode: 'manual', order: ['c', 'a', 'd'] }))).toBe('cadb');
  });
  test('manual order ignored in auto mode', () => {
    expect(uids(arrangeItems(items, { sortMode: 'auto', order: ['c', 'a'] }))).toBe('abcd');
  });
  test('manual + done to bottom', () => {
    expect(uids(arrangeItems(items, { sortMode: 'manual', order: ['d', 'c', 'b', 'a'], doneItems: 'bottom' }))).toBe('cadb');
  });
});

describe('inQuietHours', () => {
  const at = (day, h, m = 0) => new Date(2026, 9, 25 + day, h, m); // 25.10.2026 = ראשון
  const night = { enabled: true, from: '22:00', to: '07:00' };
  test('overnight range', () => {
    expect(inQuietHours(at(1, 23), night)).toBe(true);
    expect(inQuietHours(at(1, 6, 59), night)).toBe(true);
    expect(inQuietHours(at(1, 7), night)).toBe(false);
    expect(inQuietHours(at(1, 12), night)).toBe(false);
  });
  test('same-day range', () => {
    const q = { enabled: true, from: '13:00', to: '15:00' };
    expect(inQuietHours(at(1, 14), q)).toBe(true);
    expect(inQuietHours(at(1, 15), q)).toBe(false);
  });
  test('shabbat from Friday 16:00 to Saturday 20:00', () => {
    const q = { enabled: false, shabbat: true };
    expect(inQuietHours(at(5, 15), q)).toBe(false);
    expect(inQuietHours(at(5, 17), q)).toBe(true);
    expect(inQuietHours(at(6, 12), q)).toBe(true);
    expect(inQuietHours(at(6, 20, 30), q)).toBe(false);
  });
  test('disabled', () => expect(inQuietHours(at(1, 23), { enabled: false })).toBe(false));
});
