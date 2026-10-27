import { widgetState, widgetPrefs, WIDGET_DEFAULTS } from '../src/widget/prefs';

const P = (o = {}) => ({ ...WIDGET_DEFAULTS, ...o });

test('reads saved prefs and keeps defaults', () => {
  const p = widgetPrefs({ widget_bg: 'image', widget_opacity: 50 });
  expect(p.bg).toBe('image');
  expect(p.opacity).toBe(50);
  expect(p.radius).toBe(WIDGET_DEFAULTS.radius);
});

describe('what the widget shows', () => {
  test('a normal day shows the list', () => {
    expect(widgetState({ todayTotal: 4, todayOpen: 2, visibleCount: 4 }, P())).toEqual({ mode: 'list' });
  });
  test('no tasks: message / hidden / tomorrow', () => {
    const s = { todayTotal: 0, todayOpen: 0, visibleCount: 0 };
    expect(widgetState(s, P()).mode).toBe('message');
    expect(widgetState(s, P({ whenEmpty: 'hide' })).mode).toBe('hidden');
    expect(widgetState(s, P({ whenEmpty: 'tomorrow' }))).toEqual({ mode: 'list', showTomorrow: true });
  });
  test('all done: keeps list, or hides, or shows tomorrow', () => {
    const s = { todayTotal: 3, todayOpen: 0, visibleCount: 3 };
    expect(widgetState(s, P()).mode).toBe('list');
    expect(widgetState(s, P({ whenAllDone: 'hide' })).mode).toBe('hidden');
    expect(widgetState(s, P({ whenAllDone: 'tomorrow' })).showTomorrow).toBe(true);
  });
  test('all done and done items hidden → message', () => {
    expect(widgetState({ todayTotal: 3, todayOpen: 0, visibleCount: 0 }, P()).mode).toBe('message');
  });
});
