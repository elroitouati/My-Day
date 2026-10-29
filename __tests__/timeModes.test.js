import { formatTimeRange, timeModeOf, timesFor, anchorTime, END_OF_DAY } from '../src/logic/dates';
import { sortItems } from '../src/logic/dayItems';

test('formats every time mode', () => {
  expect(formatTimeRange(null, null)).toBe('כל היום');
  expect(formatTimeRange('09:00', '10:00')).toBe('09:00–10:00');
  expect(formatTimeRange('09:00', null)).toBe('09:00');
  expect(formatTimeRange('14:00', END_OF_DAY)).toBe('מ-14:00');
  expect(formatTimeRange(null, '18:00')).toBe('עד 18:00');
});

test('mode round-trips through stored times', () => {
  for (const [mode, s, e] of [
    ['allday', '09:00', '10:00'],
    ['range', '09:00', '10:00'],
    ['from', '14:00', ''],
    ['until', '09:00', '18:00'],
  ]) {
    const t = timesFor(mode, s, e);
    expect(timeModeOf(t.start_time, t.end_time)).toBe(mode);
  }
  expect(timesFor('until', '09:00', '18:00')).toEqual({ start_time: null, end_time: '18:00' });
  expect(timesFor('from', '14:00', '')).toEqual({ start_time: '14:00', end_time: END_OF_DAY });
});

test('reminders anchor on the deadline for "until" tasks', () => {
  expect(anchorTime({ startTime: null, endTime: '18:00' })).toBe('18:00');
  expect(anchorTime({ startTime: '09:00', endTime: '10:00' })).toBe('09:00');
  expect(anchorTime({ startTime: null, endTime: null })).toBe(null);
});

test('all-day first, then deadlines by time, then timed', () => {
  const it = (title, startTime, endTime) => ({ title, startTime, endTime, source: 'task' });
  const sorted = sortItems([it('timed', '08:00', '09:00'), it('until20', null, '20:00'), it('allday', null, null), it('until18', null, '18:00')]);
  expect(sorted.map((i) => i.title)).toEqual(['allday', 'until18', 'until20', 'timed']);
});
