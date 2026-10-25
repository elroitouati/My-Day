import { splitEvent } from '../src/logic/calendarEvents';

const local = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min).toISOString();

test('timed single-day event', () => {
  const rows = splitEvent({ id: 1, title: 'פגישה', startDate: local(2026, 10, 25, 9), endDate: local(2026, 10, 25, 10, 30) }, '2026-10-01', '2026-10-31');
  expect(rows).toEqual([expect.objectContaining({ event_id: '1', date: '2026-10-25', start_time: '09:00', end_time: '10:30', all_day: 0 })]);
});

test('all-day event stored at UTC midnight with exclusive end', () => {
  const rows = splitEvent({ id: 2, allDay: true, startDate: '2026-10-25T00:00:00.000Z', endDate: '2026-10-27T00:00:00.000Z' }, '2026-10-01', '2026-10-31');
  expect(rows.map((r) => r.date)).toEqual(['2026-10-25', '2026-10-26']);
  expect(rows.every((r) => r.all_day === 1)).toBe(true);
});

test('timed event across three days', () => {
  const rows = splitEvent({ id: 3, startDate: local(2026, 10, 25, 20), endDate: local(2026, 10, 27, 8) }, '2026-10-01', '2026-10-31');
  expect(rows.map((r) => [r.date, r.all_day, r.start_time, r.end_time])).toEqual([
    ['2026-10-25', 0, '20:00', '23:59'],
    ['2026-10-26', 1, null, null],
    ['2026-10-27', 0, '00:00', '08:00'],
  ]);
});

test('event ending exactly at midnight stays on one day', () => {
  const rows = splitEvent({ id: 4, startDate: local(2026, 10, 25, 22), endDate: local(2026, 10, 26, 0) }, '2026-10-01', '2026-10-31');
  expect(rows).toHaveLength(1);
  expect(rows[0].date).toBe('2026-10-25');
});

test('clips to range', () => {
  const rows = splitEvent({ id: 5, allDay: true, startDate: '2026-09-29T00:00:00.000Z', endDate: '2026-10-03T00:00:00.000Z' }, '2026-10-01', '2026-10-31');
  expect(rows.map((r) => r.date)).toEqual(['2026-10-01', '2026-10-02']);
});
