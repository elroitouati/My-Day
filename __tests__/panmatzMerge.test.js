// מיזוג שורות שמגיעות מ-Supabase מול העותק המקומי ותור האופליין (DB מדומה בזיכרון)
const mockRows = new Map();
let mockQueue = [];
jest.mock('../src/db/repo', () => ({
  getPanmatzRow: async (date, goalId) => mockRows.get(`${date}|${goalId}`) || null,
  upsertPanmatzRow: async (r) => mockRows.set(`${r.date}|${r.goal_id}`, { ...r }),
  getQueue: async () => [...mockQueue],
  enqueueChange: async (c) => {
    mockQueue = [...mockQueue.filter((q) => !(q.date === c.date && q.goal_id === c.goal_id)), c];
  },
  dequeue: async (c) => {
    mockQueue = mockQueue.filter((q) => !(q.date === c.date && q.goal_id === c.goal_id && q.updated_at === c.updated_at));
  },
}));
jest.mock('../src/services/supabase', () => ({ supabase: null, currentUser: async () => null }));

const { mergeRemoteRows, markPanmatz } = require('../src/services/panmatzSync');

const row = (o) => ({ date: '2026-10-25', goal_id: 'pullups', title: 'מתח', target: '5 חז׳', done: false, deleted: false, ...o });

beforeEach(() => {
  mockRows.clear();
  mockQueue = [];
});

test('new remote row is stored', async () => {
  expect(await mergeRemoteRows([row({ updated_at: '2026-10-25T10:00:00Z' })])).toBe(true);
  expect(mockRows.get('2026-10-25|pullups').done).toBe(false);
});

test('newer remote completion overrides local', async () => {
  await mergeRemoteRows([row({ updated_at: '2026-10-25T10:00:00Z' })]);
  expect(await mergeRemoteRows([row({ done: true, updated_at: '2026-10-25T11:00:00Z' })])).toBe(true);
  expect(mockRows.get('2026-10-25|pullups').done).toBe(true);
});

test('older remote row does not override', async () => {
  await mergeRemoteRows([row({ done: true, updated_at: '2026-10-25T11:00:00Z' })]);
  expect(await mergeRemoteRows([row({ done: false, updated_at: '2026-10-25T10:00:00Z' })])).toBe(false);
  expect(mockRows.get('2026-10-25|pullups').done).toBe(true);
});

test('offline mark stays queued and wins over an older server row', async () => {
  const past = new Date(Date.now() - 60000).toISOString();
  await mergeRemoteRows([row({ updated_at: past })]);
  await markPanmatz('2026-10-25', 'pullups', true); // אין משתמש → נשאר בתור
  expect(mockQueue).toHaveLength(1);
  await mergeRemoteRows([row({ done: false, updated_at: past })]);
  expect(mockRows.get('2026-10-25|pullups').done).toBe(true);
  expect(mockQueue).toHaveLength(1);
});

test('a newer server change drops the stale queued change', async () => {
  await markPanmatz('2026-10-25', 'pullups', true);
  const future = new Date(Date.now() + 60000).toISOString();
  await mergeRemoteRows([row({ done: false, updated_at: future })]);
  expect(mockRows.get('2026-10-25|pullups').done).toBe(false);
  expect(mockQueue).toHaveLength(0);
});

test('marking twice offline keeps a single queued change', async () => {
  await markPanmatz('2026-10-25', 'pullups', true);
  await markPanmatz('2026-10-25', 'pullups', false);
  expect(mockQueue).toHaveLength(1);
  expect(mockQueue[0].done).toBe(false);
});
