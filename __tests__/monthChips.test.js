import { monthChips } from "../src/logic/monthChips";

const item = (o) => ({
  uid: o.title,
  source: "task",
  color: "#000",
  startTime: null,
  done: false,
  ...o,
});

test("all-day calendar events first, done last, panmatz grouped", () => {
  const items = [
    item({ title: "משימה", startTime: "10:00" }),
    item({ title: "בוצע", done: true }),
    item({ title: "חג", source: "calendar" }),
    item({ title: "ריצה", source: "panmatz", done: true }),
    item({ title: "שכיבות", source: "panmatz" }),
  ];
  const { chips, more } = monthChips(items, 10);
  expect(chips.map((c) => c.title)).toEqual([
    "חג",
    'פנמ"צ 1/2',
    "משימה",
    "בוצע",
  ]);
  expect(chips[0].kind).toBe("fill");
  expect(more).toBe(0);
});

test("overflow leaves room for +N", () => {
  const items = ["א", "ב", "ג", "ד", "ה"].map((t) => item({ title: t }));
  const { chips, more } = monthChips(items, 3);
  expect(chips).toHaveLength(2);
  expect(more).toBe(3);
});

test("timed calendar event is a bar", () => {
  const { chips } = monthChips(
    [item({ title: "פגישה", source: "calendar", startTime: "09:00" })],
    3,
  );
  expect(chips[0].kind).toBe("bar");
});
