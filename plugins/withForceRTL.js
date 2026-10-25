// מפעיל RTL כבר בהפעלה הראשונה של האפליקציה (בלי צורך בהפעלה מחדש),
// ומוודא שהאפליקציה מצהירה על תמיכה ב-RTL במניפסט.
const { withMainApplication, withAndroidManifest } = require('expo/config-plugins');

const MARKER = '// my-day: force RTL';
const LINES = [
  MARKER,
  'com.facebook.react.modules.i18nmanager.I18nUtil.getInstance().allowRTL(this, true)',
  'com.facebook.react.modules.i18nmanager.I18nUtil.getInstance().forceRTL(this, true)',
];

function withForceRTL(config) {
  config = withMainApplication(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (!src.includes(MARKER)) {
      const isKotlin = cfg.modResults.language === 'kt';
      const lines = LINES.map((l, i) => (i === 0 || isKotlin ? l : `${l};`));
      src = src.replace(/super\.onCreate\(\);?/, (m) => `${m}\n    ${lines.join('\n    ')}`);
      cfg.modResults.contents = src;
    }
    return cfg;
  });
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) app.$['android:supportsRtl'] = 'true';
    return cfg;
  });
  return config;
}

module.exports = withForceRTL;
