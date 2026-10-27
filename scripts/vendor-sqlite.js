// מעתיק את קוד המקור של SQLite מהריפו למקום שבו expo-sqlite מחפש אותו בזמן הבנייה.
// ככה הבנייה ב-EAS לא תלויה בהורדה מ-sqlite.org (שנכשלה פעם ב-"Network is unreachable").
// בנוסף מכבים את onlyIfNewer — אחרת המשימה עדיין פונה לרשת כדי להשוות תאריכים.
const fs = require('fs');
const path = require('path');

const FILE = 'sqlite-amalgamation-3450300.zip';
const src = path.join(__dirname, '..', 'vendor', FILE);
const pkg = path.join(__dirname, '..', 'node_modules', 'expo-sqlite', 'android');

try {
  if (!fs.existsSync(pkg) || !fs.existsSync(src)) process.exit(0);
  const destDir = path.join(pkg, 'build', 'downloads');
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, path.join(destDir, FILE));
  console.log(`vendor-sqlite: copied ${FILE}`);

  const gradle = path.join(pkg, 'build.gradle');
  const g = fs.readFileSync(gradle, 'utf8');
  if (g.includes('onlyIfNewer(true)')) {
    fs.writeFileSync(gradle, g.replace('onlyIfNewer(true)', 'onlyIfNewer(false)\n  onlyIf { !it.dest.exists() }'));
    console.log('vendor-sqlite: download disabled when file exists');
  }
} catch (e) {
  console.warn('vendor-sqlite: skipped', e.message);
}
