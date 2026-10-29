import { importantAlarmTimes } from '../src/services/notifications';
import { parseAlarms } from '../src/services/alarms';

jest.mock('expo-modules-core', () => ({ requireOptionalNativeModule: () => null }));
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }));
jest.mock('../src/db/repo', () => ({}));

const day = '2026-11-02';
const task = (o) => ({ source: 'task', id: 't1', title: 'פגישה', startTime: '10:00', important: true, done: false, task: { alarms: '[15,0]' }, ...o });

test('parseAlarms handles json, arrays and junk', () => {
  expect(parseAlarms('[15,0]')).toEqual([15, 0]);
  expect(parseAlarms([5])).toEqual([5]);
  expect(parseAlarms('oops')).toEqual([]);
  expect(parseAlarms(null)).toEqual([]);
});

test('one alarm per chosen offset, only for open important timed tasks', () => {
  const byDate = { [day]: [task(), task({ id: 't2', important: false }), task({ id: 't3', startTime: null }), task({ id: 't4', done: true })] };
  const out = importantAlarmTimes(byDate, [day], 0);
  expect(out.map((a) => [a.item.id, a.minutes])).toEqual([
    ['t1', 15],
    ['t1', 0],
  ]);
  expect(new Date(out[0].at).getHours() * 60 + new Date(out[0].at).getMinutes()).toBe(9 * 60 + 45);
});

test('skips past alarms and Shabbat when asked', () => {
  const ten = new Date(2026, 10, 2, 9, 50).getTime();
  expect(importantAlarmTimes({ [day]: [task()] }, [day], ten).map((a) => a.minutes)).toEqual([0]);
  const sat = '2026-11-07';
  expect(importantAlarmTimes({ [sat]: [task()] }, [sat], 0, { shabbat: true })).toEqual([]);
});
