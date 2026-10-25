// מיזוג "האחרון קובע" (last-write-wins) לפי updated_at — טהור ומכוסה בבדיקות.
// משמש את My Day כשמגיעות שורות מ-Supabase. (התור המקומי עצמו הוא טבלת SQLite
// עם מפתח ראשי date+goal_id, כך ששינוי חדש לאותו פריט מחליף את הקודם.)

const ts = (v) => (v ? new Date(v).getTime() : 0);

// האם שורה מרוחקת צריכה לדרוס את המקומית
export function remoteWins(local, remote) {
  if (!local) return true;
  return ts(remote.updated_at) > ts(local.updated_at);
}
