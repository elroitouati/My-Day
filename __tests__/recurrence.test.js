import { occursOn, occurrencesInRange, validateRule, describeRule, monthlyDayFor } from '../src/logic/recurrence';
import { addDays, diffDays, startOfWeek, buildMonthGrid, weekday } from '../src/logic/dates';

const rec = (rule, start_date = '2026-01-01', end_date = null) => ({
  kind: 'recurring',
  rule: JSON.stringify(rule),
  start_date,
  end_date,
});

describe('dates', () => {
  test('addDays crosses months, years and DST', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-27', 1)).toBe('2026-03-28'); // שעון קיץ בישראל
    expect(addDays('2026-10-25', -1)).toBe('2026-10-24');
  });
  test('diffDays', () => {
    expect(diffDays('2026-03-01', '2026-04-01')).toBe(31);
    expect(diffDays('2026-04-01', '2026-03-01')).toBe(-31);
  });
  test('startOfWeek returns Sunday', () => {
    expect(startOfWeek('2026-10-28')).toBe('2026-10-25');
    expect(weekday(startOfWeek('2026-11-07'))).toBe(0);
  });
  test('month grid starts on Sunday and has full weeks', () => {
    const grid = buildMonthGrid(2026, 1); // פברואר 2026 מתחיל ביום ראשון
    expect(grid[0][0]).toBe('2026-02-01');
    grid.forEach((w) => expect(w).toHaveLength(7));
  });
});

describe('one-time tasks', () => {
  const t = { kind: 'once', date: '2026-10-25' };
  test('occurs only on its date', () => {
    expect(occursOn(t, '2026-10-25')).toBe(true);
    expect(occursOn(t, '2026-10-26')).toBe(false);
  });
  test('skip removes it', () => {
    expect(occursOn(t, '2026-10-25', new Set(['2026-10-25']))).toBe(false);
  });
});

describe('daily', () => {
  const t = rec({ freq: 'daily' }, '2026-10-10', '2026-10-20');
  test('respects start and end dates', () => {
    expect(occursOn(t, '2026-10-09')).toBe(false);
    expect(occursOn(t, '2026-10-10')).toBe(true);
    expect(occursOn(t, '2026-10-20')).toBe(true);
    expect(occursOn(t, '2026-10-21')).toBe(false);
  });
  test('range count', () => {
    expect(occurrencesInRange(t, '2026-10-01', '2026-10-31')).toHaveLength(11);
  });
  test('open-ended', () => {
    const open = rec({ freq: 'daily' }, '2026-10-10');
    expect(occursOn(open, '2030-01-01')).toBe(true);
  });
});

describe('weekly on chosen days', () => {
  // ראשון, שלישי, שישי
  const t = rec({ freq: 'weekly', days: [0, 2, 5] }, '2026-10-01');
  test('matches weekdays only', () => {
    expect(occursOn(t, '2026-10-25')).toBe(true); // ראשון
    expect(occursOn(t, '2026-10-26')).toBe(false); // שני
    expect(occursOn(t, '2026-10-27')).toBe(true); // שלישי
    expect(occursOn(t, '2026-10-30')).toBe(true); // שישי
    expect(occursOn(t, '2026-10-31')).toBe(false); // שבת
  });
  test('describe', () => {
    expect(describeRule(t)).toBe('בימים א׳ ג׳ ו׳');
  });
});

describe('every X days from start', () => {
  const t = rec({ freq: 'interval', every: 3 }, '2026-10-01');
  test('counts from the start date', () => {
    expect(occursOn(t, '2026-10-01')).toBe(true);
    expect(occursOn(t, '2026-10-02')).toBe(false);
    expect(occursOn(t, '2026-10-04')).toBe(true);
    expect(occursOn(t, '2026-09-28')).toBe(false); // לפני ההתחלה
  });
  test('works across month boundary and DST change', () => {
    const t2 = rec({ freq: 'interval', every: 7 }, '2026-03-20');
    expect(occursOn(t2, '2026-03-27')).toBe(true);
    expect(occursOn(t2, '2026-04-03')).toBe(true);
    expect(occursOn(t2, '2026-10-30')).toBe(true); // אחרי מעבר שעון חורף
  });
  test('describe', () => {
    expect(describeRule(t)).toBe('כל 3 ימים');
    expect(describeRule(rec({ freq: 'interval', every: 2 }))).toBe('כל יומיים');
  });
});

describe('monthly on a given day', () => {
  test('regular day', () => {
    const t = rec({ freq: 'monthly', day: 15 }, '2026-01-01');
    expect(occursOn(t, '2026-03-15')).toBe(true);
    expect(occursOn(t, '2026-03-16')).toBe(false);
  });
  test('day 31 falls back to the last day of shorter months', () => {
    const t = rec({ freq: 'monthly', day: 31 }, '2026-01-01');
    expect(occursOn(t, '2026-01-31')).toBe(true);
    expect(occursOn(t, '2026-02-28')).toBe(true);
    expect(occursOn(t, '2026-04-30')).toBe(true);
    expect(occursOn(t, '2026-04-29')).toBe(false);
    expect(occurrencesInRange(t, '2026-01-01', '2026-12-31')).toHaveLength(12);
  });
  test('leap year February', () => {
    const t = rec({ freq: 'monthly', day: 30 }, '2028-01-01');
    expect(occursOn(t, '2028-02-29')).toBe(true);
    expect(monthlyDayFor(30, 2028, 1)).toBe(29);
    expect(monthlyDayFor(30, 2027, 1)).toBe(28);
  });
});

describe('skips and validation', () => {
  test('skip a single occurrence', () => {
    const t = rec({ freq: 'daily' }, '2026-10-01');
    const skips = new Set(['2026-10-03']);
    expect(occurrencesInRange(t, '2026-10-01', '2026-10-05', skips)).toEqual([
      '2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05',
    ]);
  });
  test('validateRule', () => {
    expect(validateRule({ freq: 'daily' })).toBe(true);
    expect(validateRule({ freq: 'weekly', days: [] })).toBe(false);
    expect(validateRule({ freq: 'interval', every: 0 })).toBe(false);
    expect(validateRule({ freq: 'monthly', day: 32 })).toBe(false);
    expect(validateRule('not json')).toBe(false);
  });
});
