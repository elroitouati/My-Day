import { rankSuggestions, highlightParts } from '../src/logic/suggest';

const H = [
  { title: 'אימון כושר', uses: 5, last_used: 10 },
  { title: 'אימון ריצה', uses: 9, last_used: 5 },
  { title: 'שיעור אנגלית', uses: 2, last_used: 30 },
  { title: 'הינדיקים חנן בן ארי', uses: 1, last_used: 40 },
  { title: 'לחזור על אימון', uses: 20, last_used: 50 },
];

test('starts-with first, then by use', () => {
  expect(rankSuggestions(H, 'אימ').map((h) => h.title)).toEqual(['אימון ריצה', 'אימון כושר', 'לחזור על אימון']);
});
test('word start beats middle of a word', () => {
  expect(rankSuggestions(H, 'אנג').map((h) => h.title)).toEqual(['שיעור אנגלית']);
});
test('exact title is not suggested again', () => {
  expect(rankSuggestions(H, 'אימון כושר').map((h) => h.title)).not.toContain('אימון כושר');
});
test('empty query → nothing', () => expect(rankSuggestions(H, '  ')).toEqual([]));
test('limit', () => expect(rankSuggestions(H, 'ן', 2)).toHaveLength(2));
test('highlight the matching part', () => {
  expect(highlightParts('הינדיקים חנן בן ארי', 'הינ')).toEqual([
    { text: 'הינ', hit: true },
    { text: 'דיקים חנן בן ארי', hit: false },
  ]);
  expect(highlightParts('לחזור על אימון', 'אימ')).toEqual([
    { text: 'לחזור על ', hit: false },
    { text: 'אימ', hit: true },
    { text: 'ון', hit: false },
  ]);
});
