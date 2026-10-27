import { buildRangeItems, progress } from '../src/logic/dayItems';
import { remoteWins } from '../src/logic/syncMerge';

const base = () => ({
  tasks: [
    { id: 't1', kind: 'once', date: '2026-10-25', title: 'פגישה', start_time: '10:00', end_time: '11:00', category_id: 'work' },
    { id: 't2', kind: 'recurring', rule: '{"freq":"daily"}', start_date: '2026-10-20', title: 'מים', category_id: null },
    { id: 't3', kind: 'once', date: '2026-10-25', title: 'בוקר', start_time: '07:00', category_id: 'work' },
  ],
  skips: new Map(),
  completions: new Set(['task:t3|2026-10-25', 'task:t2|2026-10-24']),
  categories: new Map([['work', { id: 'work', name: 'עבודה', color: '#3A86FF' }]]),
  calEvents: [{ key: 'e1', event_id: 'e1', date: '2026-10-25', title: 'יום הולדת', all_day: 1, color: '#ff0000' }],
  panmatz: [
    { date: '2026-10-25', goal_id: 'pullups', title: 'מתח', target: '5 חזרות', done: 1 },
    { date: '2026-10-25', goal_id: 'old', title: 'נמחק', done: 0, deleted: 1 },
  ],
});

test('merges all sources, all-day first then by time', () => {
  const items = buildRangeItems('2026-10-25', '2026-10-25', base(), '2026-10-25')['2026-10-25'];
  expect(items.map((i) => i.title)).toEqual(['מים', 'מתח', 'יום הולדת', 'בוקר', 'פגישה']);
  expect(items.find((i) => i.title === 'מתח').done).toBe(true);
  expect(items.find((i) => i.title === 'בוקר').done).toBe(true);
  expect(progress(items)).toEqual({ total: 5, done: 2, ratio: 0.4 });
});

test('past unchecked tasks are only "unmarked"; missed is for Panmatz alone', () => {
  const data = base();
  data.panmatz.push({ date: '2026-10-23', goal_id: 'run', title: 'ריצה', done: 0 });
  const byDate = buildRangeItems('2026-10-23', '2026-10-25', data, '2026-10-25');
  expect(byDate['2026-10-23'].find((i) => i.title === 'מים')).toMatchObject({ missed: false, unmarked: true });
  expect(byDate['2026-10-23'].find((i) => i.title === 'ריצה')).toMatchObject({ missed: true, unmarked: false });
  expect(byDate['2026-10-24'][0]).toMatchObject({ title: 'מים', missed: false, done: true });
  expect(byDate['2026-10-25'].every((i) => !i.missed)).toBe(true);
  expect(byDate['2026-10-25'].filter((i) => i.title === 'מים')).toHaveLength(1);
});

describe('last-write-wins sync', () => {
  test('remote newer wins, older loses', () => {
    expect(remoteWins({ updated_at: '2026-10-25T10:00:00Z' }, { updated_at: '2026-10-25T10:00:01Z' })).toBe(true);
    expect(remoteWins({ updated_at: '2026-10-25T10:00:01Z' }, { updated_at: '2026-10-25T10:00:00Z' })).toBe(false);
    expect(remoteWins(null, { updated_at: '2026-10-25T10:00:00Z' })).toBe(true);
  });
});
