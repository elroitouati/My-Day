// הווידג'ט למסך הבית. נבנה מרכיבי react-native-android-widget ומרונדר כתמונה.
// שימו לב: הווידג'ט מרונדר תמיד משמאל לימין, ולכן הסדר כאן "הפוך" —
// מה שכתוב ראשון מופיע בצד שמאל, כדי שהתוצאה תיראה RTL מלא.
// כל העיצוב נשלט מהעדפות הווידג'ט (src/widget/prefs.js) — ראו עורך הווידג'ט באפליקציה.
import React from 'react';
import { FlexWidget, TextWidget, ListWidget, SvgWidget, OverlapWidget, ImageWidget } from 'react-native-android-widget';
import { formatDayTitle, formatHebDate, formatTimeRange, HEB_WEEKDAYS_FULL, weekday } from '../logic/dates';
import { buildPalette } from '../design/tokens';
import { WIDGET_DEFAULTS } from './prefs';

const F = {
  regular: 'Heebo-Regular',
  medium: 'Heebo-Medium',
  bold: 'Heebo-Bold',
  heavy: 'Heebo-ExtraBold',
};
const CLEAR = 'rgba(0, 0, 0, 0)';

function rgba(hex, a) {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`;
}
function isDarkColor(hex) {
  const n = parseInt(hex.slice(1, 7), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 140;
}

// צבעי הווידג'ט: ערכת בסיס + רקע + צבע טקסט שמתאים לרקע
export function widgetColors(prefs, app = {}) {
  const mode = prefs.theme === 'app' ? app.mode || 'light' : prefs.theme;
  const base = buildPalette(mode, app.accent || 'violet');
  let bg;
  if (prefs.bg === 'solid') bg = base.card;
  else if (prefs.bg === 'color') bg = prefs.bgColor || base.card;
  else bg = null; // none / image

  let lightText;
  if (prefs.textColor === 'light') lightText = true;
  else if (prefs.textColor === 'dark') lightText = false;
  else if (prefs.bg === 'image') lightText = true;
  else if (prefs.bg === 'color') lightText = isDarkColor(bg);
  else lightText = base.mode === 'dark';

  return {
    bg: bg ? (prefs.opacity >= 100 ? bg : rgba(bg, prefs.opacity / 100)) : CLEAR,
    ink: lightText ? '#FFFFFF' : '#15172B',
    ink2: lightText ? '#E4E6F2' : '#5B6078',
    ink3: lightText ? '#C2C5D8' : '#8E93AB',
    brand: base.brand,
    onBrand: base.onBrand,
    soft: lightText ? 'rgba(255, 255, 255, 0.2)' : base.brandSoft,
    softText: lightText ? '#FFFFFF' : base.brand,
    track: lightText ? 'rgba(255, 255, 255, 0.25)' : base.sunken,
    ring: CLEAR,
  };
}

const checkSvg = (color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const calendarSvg = (color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke="${color}" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="${color}" stroke-width="2" stroke-linecap="round"/></svg>`;
const plusSvg = (color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/></svg>`;

const SCALE = { s: 0.88, m: 1, l: 1.15 };

// pop — הפריים הראשון אחרי לחיצה: העיגול גדל עם הילה, ואז חוזר לגודל הרגיל
function Check({ item, C, z, pop }) {
  const size = Math.round((pop ? 32 : 28) * z);
  const halo = Math.round(40 * z);
  return (
    <FlexWidget
      clickAction="TOGGLE"
      clickActionData={{
        source: item.source,
        id: item.id,
        date: item.date,
        done: item.done,
      }}
      style={{
        width: Math.round(42 * z),
        height: Math.round(42 * z),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <FlexWidget
        style={{
          width: halo,
          height: halo,
          borderRadius: halo / 2,
          backgroundColor: pop && item.done ? rgba(item.color, 0.28) : CLEAR,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FlexWidget
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: item.done ? item.color : C.ring,
            borderWidth: item.done ? 0 : 2,
            borderColor: item.color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {item.done ? (
            <SvgWidget
              svg={checkSvg('#FFFFFF')}
              style={{
                width: Math.round((pop ? 20 : 17) * z),
                height: Math.round((pop ? 20 : 17) * z),
              }}
            />
          ) : null}
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

function Row({ item, C, z, prefs, pop }) {
  const meta = [prefs.showTime ? formatTimeRange(item.startTime, item.endTime) : null, prefs.showCategory ? item.subtitle || item.categoryName : null]
    .filter(Boolean)
    .join(' · ');
  const h = Math.round((prefs.rows === 'compact' ? (meta ? 44 : 36) : meta ? 56 : 44) * z);
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: h,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        backgroundColor: pop ? C.soft : CLEAR,
      }}
    >
      <Check item={item} C={C} z={z} pop={pop} />
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          flex: 1,
          height: 'match_parent',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingLeft: 6,
          paddingRight: 10,
        }}
      >
        <TextWidget
          text={item.important && !item.done ? `★ ${item.title}` : item.title}
          maxLines={1}
          truncate="END"
          style={{
            fontSize: Math.round(15 * z),
            fontFamily: item.done ? F.medium : F.bold,
            color: item.done ? C.ink3 : C.ink,
            textAlign: 'right',
          }}
        />
        {meta ? (
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextWidget
              text={meta}
              maxLines={1}
              truncate="END"
              style={{
                fontSize: Math.round(12 * z),
                fontFamily: F.regular,
                color: C.ink3,
                textAlign: 'right',
              }}
            />
            {item.source === 'calendar' ? <SvgWidget svg={calendarSvg(C.ink3)} style={{ width: 12, height: 12, marginLeft: 4 }} /> : null}
          </FlexWidget>
        ) : null}
      </FlexWidget>
      <FlexWidget
        style={{
          width: 5,
          height: Math.round(28 * z),
          borderRadius: 3,
          backgroundColor: item.color,
        }}
      />
    </FlexWidget>
  );
}

function ProgressBar({ ratio, C }) {
  const fill = Math.round(ratio * 1000);
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 6,
        borderRadius: 3,
        backgroundColor: C.track,
        flexDirection: 'row',
        marginTop: 8,
        marginBottom: 4,
      }}
    >
      {fill < 1000 ? <FlexWidget style={{ flex: 1000 - fill, height: 6 }} /> : null}
      {fill > 0 ? (
        <FlexWidget
          style={{
            flex: fill,
            height: 6,
            borderRadius: 3,
            backgroundColor: C.brand,
          }}
        />
      ) : null}
    </FlexWidget>
  );
}

function dateText(dateKey, style, isTomorrow) {
  if (style === 'none') return null;
  const prefix = isTomorrow ? 'מחר · ' : '';
  if (style === 'short') return `${prefix}${isTomorrow ? '' : 'יום '}${HEB_WEEKDAYS_FULL[weekday(dateKey)]}`;
  return `${prefix}${formatDayTitle(dateKey)} · ${formatHebDate(dateKey)}`;
}

function Header({ C, z, prefs, stats, dateKey, isTomorrow }) {
  const date = dateText(dateKey, prefs.dateStyle, isTomorrow);
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {prefs.showAdd ? (
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'myday://add' }}
          style={{
            width: Math.round(34 * z),
            height: Math.round(34 * z),
            borderRadius: Math.round(17 * z),
            backgroundColor: C.brand,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SvgWidget svg={plusSvg(C.onBrand)} style={{ width: 18, height: 18 }} />
        </FlexWidget>
      ) : null}
      {prefs.showCounter && stats.total ? (
        <FlexWidget
          style={{
            marginLeft: prefs.showAdd ? 8 : 0,
            paddingHorizontal: 10,
            height: Math.round(26 * z),
            borderRadius: 13,
            backgroundColor: C.soft,
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text={`${stats.done}/${stats.total}`}
            style={{
              fontSize: Math.round(13 * z),
              fontFamily: F.bold,
              color: C.softText,
            }}
          />
        </FlexWidget>
      ) : null}
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          flex: 1,
          flexDirection: 'column',
          alignItems: 'flex-end',
          paddingRight: 4,
        }}
      >
        <TextWidget
          text="My Day"
          style={{
            fontSize: Math.round(18 * z),
            fontFamily: F.heavy,
            color: C.ink,
          }}
        />
        {date ? (
          <TextWidget
            text={date}
            maxLines={1}
            style={{
              fontSize: Math.round(12 * z),
              fontFamily: F.medium,
              color: C.ink2,
              textAlign: 'right',
            }}
          />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}

function Message({ C, z, stats }) {
  const allDone = stats.total > 0;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        height: 'wrap_content',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        paddingVertical: 14,
      }}
    >
      <TextWidget text={allDone ? '🎉' : '✨'} style={{ fontSize: Math.round(24 * z) }} />
      <TextWidget
        text={allDone ? 'הכל הושלם להיום!' : 'אין משימות להיום'}
        style={{
          fontSize: Math.round(15 * z),
          fontFamily: F.bold,
          color: C.ink,
          marginTop: 4,
        }}
      />
      <TextWidget
        text={allDone ? 'כל הכבוד' : 'לחץ על + כדי להוסיף'}
        style={{
          fontSize: Math.round(12 * z),
          fontFamily: F.regular,
          color: C.ink3,
        }}
      />
    </FlexWidget>
  );
}

export function MyDayWidget({ today, dateKey, isTomorrow = false, items, stats, mode = 'list', prefs: p, app, pop, width = 320, height = 240 }) {
  const prefs = { ...WIDGET_DEFAULTS, ...(p || {}) };
  const C = widgetColors(prefs, app);
  const z = SCALE[prefs.textSize] || 1;
  const shown = dateKey || today;
  const st = stats || { total: 0, done: 0, ratio: 0 };

  // "נעלם": שקוף לגמרי (לחיצה עדיין פותחת את האפליקציה)
  if (mode === 'hidden') {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          width: 'match_parent',
          height: 'match_parent',
          backgroundColor: CLEAR,
        }}
      />
    );
  }

  const fit = prefs.fit === 'content' && prefs.bg !== 'image';
  const limit = prefs.maxItems > 0 ? prefs.maxItems : items.length;
  const visible = items.slice(0, limit);
  const more = items.length - visible.length;

  const content = [
    prefs.showHeader ? <Header key="h" C={C} z={z} prefs={prefs} stats={st} dateKey={shown} isTomorrow={isTomorrow} /> : null,
    prefs.showProgress && st.total && !isTomorrow ? <ProgressBar key="p" ratio={st.ratio} C={C} /> : null,
    mode === 'message' ? (
      <Message key="m" C={C} z={z} stats={st} />
    ) : fit ? (
      <FlexWidget key="l" style={{ width: 'match_parent', flexDirection: 'column' }}>
        {visible.map((item) => (
          <Row key={item.uid} item={item} C={C} z={z} prefs={prefs} pop={pop === `${item.source}:${item.id}`} />
        ))}
        {more > 0 ? (
          <TextWidget
            clickAction="OPEN_APP"
            text={`+${more} נוספות`}
            style={{
              fontSize: Math.round(12 * z),
              fontFamily: F.bold,
              color: C.ink2,
              textAlign: 'right',
              marginTop: 2,
            }}
          />
        ) : null}
      </FlexWidget>
    ) : (
      <ListWidget key="l" style={{ width: 'match_parent', height: 'match_parent' }}>
        {visible.map((item) => (
          <Row key={item.uid} item={item} C={C} z={z} prefs={prefs} pop={pop === `${item.source}:${item.id}`} />
        ))}
      </ListWidget>
    ),
  ];

  const pad = {
    paddingHorizontal: 12,
    paddingTop: prefs.showHeader ? 12 : 6,
    paddingBottom: 8,
  };

  if (prefs.bg === 'image' && prefs.image) {
    return (
      <OverlapWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          borderRadius: prefs.radius,
          overflow: 'hidden',
        }}
      >
        <ImageWidget
          image={prefs.image}
          imageWidth={width}
          imageHeight={height}
          radius={prefs.radius}
          style={{ width: 'match_parent', height: 'match_parent' }}
        />
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 'match_parent',
            borderRadius: prefs.radius,
            backgroundColor: `rgba(0, 0, 0, ${prefs.imageDim / 100})`,
          }}
        />
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 'match_parent',
            flexDirection: 'column',
            ...pad,
          }}
        >
          {content}
        </FlexWidget>
      </OverlapWidget>
    );
  }

  const card = (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: fit ? 'wrap_content' : 'match_parent',
        flexDirection: 'column',
        backgroundColor: C.bg,
        borderRadius: prefs.radius,
        ...pad,
      }}
    >
      {content}
    </FlexWidget>
  );
  if (!fit) return card;
  // מתכווץ לפי התוכן: הכרטיס בגובה התוכן, והשאר שקוף
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        backgroundColor: CLEAR,
      }}
    >
      {card}
    </FlexWidget>
  );
}

// נתוני דוגמה לתצוגה המקדימה כשאין משימות
export function sampleItems(dateKey) {
  const mk = (id, title, color, startTime, endTime, categoryName, done) => ({
    uid: `sample-${id}`,
    source: 'task',
    id: `sample-${id}`,
    date: dateKey,
    title,
    color,
    startTime,
    endTime,
    categoryName,
    done,
  });
  return [
    mk(1, 'שתיית 8 כוסות מים', '#10C77F', null, null, 'בריאות', true),
    mk(2, 'שיעור מתמטיקה', '#8B5CF6', '10:00', '11:30', 'לימודים', false),
    mk(3, 'אימון כוח', '#E0A100', '17:00', null, 'פנמ"צ', false),
    mk(4, 'לסדר את החדר', '#FF8A00', '18:00', '18:30', 'בית', false),
  ];
}
