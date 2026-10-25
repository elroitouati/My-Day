import { planDelete, planEdit } from '../src/logic/editing';

const task = {
  id: 'a',
  kind: 'recurring',
  title: 'ריצה',
  rule: JSON.stringify({ freq: 'daily' }),
  start_date: '2026-10-01',
  end_date: null,
  start_time: '07:00',
  end_time: '07:30',
  reminder: 10,
};

describe('delete', () => {
  test('only this occurrence → skip', () => {
    expect(planDelete(task, '2026-10-10', 'one')).toEqual([{ op: 'skip', id: 'a', date: '2026-10-10' }]);
  });
  test('this and following → end the day before', () => {
    expect(planDelete(task, '2026-10-10', 'future')).toEqual([
      { op: 'update', id: 'a', patch: { end_date: '2026-10-09' } },
    ]);
  });
  test('this and following from the first occurrence → delete all', () => {
    expect(planDelete(task, '2026-10-01', 'future')).toEqual([{ op: 'delete', id: 'a' }]);
  });
  test('one-time task → delete', () => {
    expect(planDelete({ id: 'b', kind: 'once', date: '2026-10-10' }, '2026-10-10', 'one')).toEqual([
      { op: 'delete', id: 'b' },
    ]);
  });
});

describe('edit', () => {
  const draft = { ...task, title: 'ריצה ארוכה', start_time: '08:00' };
  test('only this occurrence → skip + one-time copy', () => {
    const plan = planEdit(task, '2026-10-10', 'one', draft, () => 'new');
    expect(plan[0]).toEqual({ op: 'skip', id: 'a', date: '2026-10-10' });
    expect(plan[1].task).toMatchObject({ id: 'new', kind: 'once', date: '2026-10-10', title: 'ריצה ארוכה', start_time: '08:00' });
    expect(plan[1].carryCompletion).toEqual({ fromId: 'a', fromDate: '2026-10-10' });
  });
  test('this and following → split the series', () => {
    const plan = planEdit(task, '2026-10-10', 'future', draft, () => 'new');
    expect(plan[0]).toEqual({ op: 'update', id: 'a', patch: { end_date: '2026-10-09' } });
    expect(plan[1].task).toMatchObject({ id: 'new', kind: 'recurring', start_date: '2026-10-10', title: 'ריצה ארוכה' });
  });
  test('this and following from the first occurrence → update in place', () => {
    const plan = planEdit(task, '2026-10-01', 'future', draft, () => 'new');
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ op: 'update', id: 'a', patch: { title: 'ריצה ארוכה' } });
  });
});
