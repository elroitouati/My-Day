// הווידג'ט למסך הבית. נבנה מרכיבי react-native-android-widget ומרונדר כתמונה.
// שימו לב: הווידג'ט מרונדר תמיד משמאל לימין, ולכן הסדר כאן "הפוך" —
// מה שכתוב ראשון מופיע בצד שמאל, כדי שהתוצאה תיראה RTL מלא.
import React from 'react';
import { FlexWidget, TextWidget, ListWidget, SvgWidget } from 'react-native-android-widget';
import { formatDayTitle, formatHebDate, formatTimeRange } from '../logic/dates';
import { progress } from '../logic/dayItems';
import { buildPalette } from '../design/tokens';

// צבעי הווידג'ט נבנים מהערכה הפעילה (ראו widgetColors)
function widgetColors(p) {
  const dark = p.mode === 'dark';
  return {
    bg: p.card,
    ink: p.ink,
    ink2: p.ink2,
    ink3: p.ink3,
    brand: p.brand,
    brandSoft: p.brandSoft,
    onBrand: p.onBrand,
    track: p.sunken,
    line: dark ? p.line : '#F0F1F6',
  };
}
let C = widgetColors(buildPalette());

// רקע שקוף-למחצה לפי ההגדרות (100 = אטום)
function withAlpha(hex, opacity) {
  if (opacity >= 100) return hex;
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, opacity) / 100})`;
}
const F = { regular: 'Heebo-Regular', medium: 'Heebo-Medium', bold: 'Heebo-Bold', heavy: 'Heebo-ExtraBold' };

const checkSvg = (color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const calendarSvg = (color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke="${color}" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="${color}" stroke-width="2" stroke-linecap="round"/></svg>`;
const plusSvg = (color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/></svg>`;

function Check({ item }) {
  const size = 30;
  return (
    <FlexWidget
      clickAction="TOGGLE"
      clickActionData={{ source: item.source, id: item.id, date: item.date, done: item.done }}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <FlexWidget
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: item.done ? item.color : C.bg,
          borderWidth: item.done ? 0 : 2,
          borderColor: item.color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.done ? <SvgWidget svg={checkSvg('#FFFFFF')} style={{ width: 18, height: 18 }} /> : null}
      </FlexWidget>
    </FlexWidget>
  );
}

function Row({ item, compact }) {
  const meta = [formatTimeRange(item.startTime, item.endTime), item.subtitle || item.categoryName]
    .filter(Boolean)
    .join(' · ');
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: compact ? 50 : 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 3,
      }}
    >
      <Check item={item} />
      <FlexWidget
        clickAction="OPEN_APP"
        style={{ flex: 1, height: 'match_parent', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 6, paddingRight: 10 }}
      >
        <TextWidget
          text={item.title}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 15, fontFamily: item.done ? F.medium : F.bold, color: item.done ? C.ink3 : C.ink, textAlign: 'right' }}
        />
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text={meta}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 12, fontFamily: F.regular, color: C.ink3, textAlign: 'right' }}
          />
          {item.source === 'calendar' ? (
            <SvgWidget svg={calendarSvg(C.ink3)} style={{ width: 12, height: 12, marginLeft: 4 }} />
          ) : null}
        </FlexWidget>
      </FlexWidget>
      <FlexWidget style={{ width: 5, height: 30, borderRadius: 3, backgroundColor: item.color }} />
    </FlexWidget>
  );
}

function ProgressBar({ ratio }) {
  const fill = Math.round(ratio * 1000);
  return (
    <FlexWidget
      style={{ width: 'match_parent', height: 6, borderRadius: 3, backgroundColor: C.track, flexDirection: 'row', marginTop: 8, marginBottom: 6 }}
    >
      {fill < 1000 ? <FlexWidget style={{ flex: 1000 - fill, height: 6 }} /> : null}
      {fill > 0 ? <FlexWidget style={{ flex: fill, height: 6, borderRadius: 3, backgroundColor: C.brand }} /> : null}
    </FlexWidget>
  );
}

export function MyDayWidget({ today, items, stats, palette, opacity = 100, width = 320, height = 240 }) {
  C = widgetColors(palette || buildPalette());
  const p = stats || progress(items);
  const compact = width < 260 || height < 200;
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        backgroundColor: withAlpha(C.bg, opacity),
        borderRadius: 24,
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 6,
      }}
    >
      {/* כותרת: + ו"X/Y" משמאל, My Day ותאריך מימין */}
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'myday://add' }}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}
        >
          <SvgWidget svg={plusSvg(C.onBrand)} style={{ width: 18, height: 18 }} />
        </FlexWidget>
        {p.total ? (
          <FlexWidget style={{ marginLeft: 8, paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: C.brandSoft, justifyContent: 'center' }}>
            <TextWidget text={`${p.done}/${p.total}`} style={{ fontSize: 13, fontFamily: F.bold, color: C.brand }} />
          </FlexWidget>
        ) : null}
        <FlexWidget
          clickAction="OPEN_APP"
          style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-end', paddingRight: 4 }}
        >
          <TextWidget text="My Day" style={{ fontSize: 18, fontFamily: F.heavy, color: C.ink }} />
          <TextWidget
            text={`${formatDayTitle(today)} · ${formatHebDate(today)}`}
            maxLines={1}
            style={{ fontSize: 12, fontFamily: F.medium, color: C.ink2, textAlign: 'right' }}
          />
        </FlexWidget>
      </FlexWidget>

      {p.total ? <ProgressBar ratio={p.ratio} /> : null}

      {items.length ? (
        <ListWidget style={{ width: 'match_parent', height: 'match_parent' }}>
          {items.map((item) => (
            <Row key={item.uid} item={item} compact={compact} />
          ))}
        </ListWidget>
      ) : (
        <FlexWidget
          clickAction="OPEN_APP"
          style={{ width: 'match_parent', height: 'match_parent', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}
        >
          <TextWidget text={p.total ? '🎉' : '✨'} style={{ fontSize: 26 }} />
          <TextWidget text={p.total ? 'הכל הושלם להיום!' : 'אין משימות להיום'} style={{ fontSize: 15, fontFamily: F.bold, color: C.ink, marginTop: 4 }} />
          <TextWidget text={p.total ? 'כל הכבוד' : 'לחץ על + כדי להוסיף'} style={{ fontSize: 12, fontFamily: F.regular, color: C.ink3 }} />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
