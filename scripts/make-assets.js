// יוצר את האייקון, מסך הפתיחה, אייקון ההתראה ותמונת התצוגה של הווידג'ט.
// הרצה: node scripts/make-assets.js   (דורש playwright מותקן)
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const font = (f) => `file://${path.join(root, 'assets/fonts', f)}`;
const css = `
@font-face { font-family: Heebo; font-weight: 400; src: url('${font('Heebo-Regular.ttf')}'); }
@font-face { font-family: Heebo; font-weight: 700; src: url('${font('Heebo-Bold.ttf')}'); }
@font-face { font-family: Heebo; font-weight: 800; src: url('${font('Heebo-ExtraBold.ttf')}'); }
html,body { margin:0; padding:0; background: transparent; }`;

const mark = (s, bg = true) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 1024 1024">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8A7CFF"/><stop offset="1" stop-color="#5442F5"/></linearGradient></defs>
  ${bg ? '<rect width="1024" height="1024" fill="url(#g)"/>' : ''}
  <rect x="262" y="250" width="500" height="540" rx="110" fill="#FFFFFF"/>
  <rect x="340" y="560" width="240" height="40" rx="20" fill="#E6E8F0"/>
  <rect x="340" y="650" width="170" height="40" rx="20" fill="#E6E8F0"/>
  <circle cx="512" cy="410" r="105" fill="#6C5CFF"/>
  <path d="M458 414l38 38 76-82" stroke="#FFFFFF" stroke-width="34" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="742" cy="262" r="58" fill="#FFC300"/>
</svg>`;

const adaptive = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g transform="translate(512 512) scale(0.62) translate(-512 -512)">${mark(1024, false).replace(/<\/?svg[^>]*>/g, '')}</g>
</svg>`;

const notif = `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <circle cx="48" cy="48" r="36" fill="none" stroke="#FFFFFF" stroke-width="9"/>
  <path d="M31 49l12 12 23-25" stroke="#FFFFFF" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const row = (title, meta, color, done) => `
  <div class="row">
    <div class="strip" style="background:${color}"></div>
    <div class="texts"><div class="t ${done ? 'd' : ''}">${title}</div><div class="m">${meta}</div></div>
    <div class="check" style="border-color:${color};background:${done ? color : '#fff'}">${done ? '<svg width="20" height="20" viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}</div>
  </div>`;

const preview = `
<div dir="rtl" class="w">
  <div class="head">
    <div><div class="brand">My Day</div><div class="date">יום ראשון · 25 באוקטובר</div></div>
    <div class="side"><span class="pill">2/4</span><span class="plus">+</span></div>
  </div>
  <div class="bar"><div style="width:50%"></div></div>
  ${row('שתיית מים', 'כל היום · בריאות', '#10C77F', true)}
  ${row('מתח', 'כל היום · 5 חזרות · פנמ"צ', '#E0A100', true)}
  ${row('שיעור מתמטיקה', '10:00–11:30 · לימודים', '#8B5CF6', false)}
  ${row('לסדר את החדר', '18:00 · בית', '#FF8A00', false)}
</div>
<style>
 .w{width:520px;height:460px;box-sizing:border-box;background:#fff;border-radius:40px;padding:22px 22px 10px;font-family:Heebo;}
 .head{display:flex;justify-content:space-between;align-items:center}
 .brand{font-weight:800;font-size:30px;color:#15172B;line-height:1.1}
 .date{font-size:19px;color:#5B6078}
 .side{display:flex;gap:12px;align-items:center}
 .pill{background:#EEEBFF;color:#6C5CFF;font-weight:700;font-size:20px;border-radius:20px;padding:4px 16px}
 .plus{width:52px;height:52px;border-radius:26px;background:#6C5CFF;color:#fff;font-size:38px;display:flex;align-items:center;justify-content:center;line-height:1}
 .bar{height:10px;background:#EEF0F6;border-radius:5px;margin:14px 0 8px;overflow:hidden}
 .bar div{height:100%;background:#6C5CFF;border-radius:5px;margin-right:0}
 .row{display:flex;align-items:center;height:80px;gap:14px}
 .strip{width:7px;height:46px;border-radius:4px}
 .texts{flex:1}
 .t{font-weight:700;font-size:23px;color:#15172B}
 .t.d{color:#9A9FB5;font-weight:400}
 .m{font-size:17px;color:#9A9FB5}
 .check{width:44px;height:44px;border-radius:22px;border:3px solid;box-sizing:border-box;display:flex;align-items:center;justify-content:center}
</style>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const shot = async (html, w, h, file, transparent = true) => {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<html><head><style>${css}</style></head><body>${html}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(root, 'assets', file), omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } });
    console.log('wrote', file);
  };
  fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
  await shot(mark(1024), 1024, 1024, 'icon.png', false);
  await shot(adaptive, 1024, 1024, 'adaptive-icon.png');
  await shot(`<div style="width:1024px;height:1024px;background:#F5F6FA;display:flex;align-items:center;justify-content:center"><div style="width:420px;height:420px;border-radius:96px;overflow:hidden">${mark(420)}</div></div>`, 1024, 1024, 'splash.png', false);
  await shot(notif, 96, 96, 'notification-icon.png');
  await shot(preview, 520, 460, 'widget-preview.png');
  await browser.close();
})();
