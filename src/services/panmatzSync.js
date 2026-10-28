// סנכרון דו-כיווני עם פנמ"צ דרך הטבלה המשותפת panmatz_daily ב-Supabase.
//  • פנמ"צ כותבת את יעדי היום וההשלמות.
//  • My Day מציגה אותם, מאזינה ל-Realtime וכותבת חזרה כשמסמנים.
//  • אופליין: כל סימון נכנס לתור מקומי ונשלח כשחוזר החיבור. updated_at האחרון קובע.
import { supabase, currentUser } from "./supabase";
import {
  getPanmatzRow,
  upsertPanmatzRow,
  getQueue,
  enqueueChange,
  dequeue,
} from "../db/repo";
import { remoteWins } from "../logic/syncMerge";
import { addDays, todayKey } from "../logic/dates";
import { coalesce } from "./events";

const TABLE = "panmatz_daily";
const BACK = 40;
const FORWARD = 14;
const ts = (v) => (v ? new Date(v).getTime() : 0);

// שליחת התור לשרת. מחזיר true אם התור התרוקן.
async function flushNow() {
  const user = await currentUser();
  if (!user) return false;
  const queue = await getQueue();
  for (const c of queue) {
    const { error } = await supabase
      .from(TABLE)
      .update({ done: !!c.done, updated_at: c.updated_at })
      .eq("user_id", user.id)
      .eq("date", c.date)
      .eq("goal_id", c.goal_id);
    if (error) return false; // אין רשת / שגיאה — ננסה שוב בפעם הבאה
    await dequeue(c);
  }
  return true;
}
export const flushQueue = coalesce(flushNow);

// משיכת כל השורות בטווח ומיזוג "האחרון קובע". מחזיר true אם משהו השתנה.
async function pullNow() {
  const user = await currentUser();
  if (!user) return false;
  const today = todayKey();
  const { data, error } = await supabase
    .from(TABLE)
    .select("date, goal_id, title, target, done, deleted, updated_at")
    .eq("user_id", user.id)
    .gte("date", addDays(today, -BACK))
    .lte("date", addDays(today, FORWARD));
  if (error) throw error;
  return mergeRemoteRows(data || []);
}

export async function mergeRemoteRows(rows) {
  const queue = await getQueue();
  const pending = new Map(queue.map((c) => [`${c.date}|${c.goal_id}`, c]));
  let changed = false;
  for (const r of rows) {
    const local = await getPanmatzRow(r.date, r.goal_id);
    const mine = pending.get(`${r.date}|${r.goal_id}`);
    if (mine && ts(mine.updated_at) > ts(r.updated_at)) {
      // השינוי המקומי חדש יותר ועוד לא נשלח — שומרים עליו, אבל מעדכנים כותרת/יעד
      if (
        !local ||
        local.title !== r.title ||
        local.target !== r.target ||
        !!local.deleted !== !!r.deleted
      ) {
        await upsertPanmatzRow({
          ...r,
          done: mine.done,
          updated_at: mine.updated_at,
        });
        changed = true;
      }
      continue;
    }
    if (mine) await dequeue(mine); // השרת חדש יותר — השינוי המקומי ישן
    if (
      !local ||
      remoteWins(local, r) ||
      local.title !== r.title ||
      local.target !== r.target ||
      !!local.deleted !== !!r.deleted
    ) {
      await upsertPanmatzRow(r);
      changed = true;
    }
  }
  return changed;
}

let lastSyncError = null;
export const getLastSyncError = () => lastSyncError;

// סנכרון מלא: קודם שולחים, אחר כך מושכים
export async function syncPanmatz() {
  try {
    await flushQueue();
    const changed = await pullNow();
    lastSyncError = null;
    return changed;
  } catch (e) {
    lastSyncError = e;
    return false;
  }
}

// סימון מתוך My Day (מסך, ווידג'ט או התראה)
export async function markPanmatz(date, goalId, done, { flush = true } = {}) {
  const updated_at = new Date().toISOString();
  const local = await getPanmatzRow(date, goalId);
  await upsertPanmatzRow({
    ...(local || { date, goal_id: goalId }),
    done,
    updated_at,
  });
  await enqueueChange({ date, goal_id: goalId, done, updated_at });
  if (!flush) return;
  try {
    await flushQueue();
  } catch {
    // נשאר בתור
  }
}

// האזנה בזמן אמת לשינויים שמגיעים מפנמ"צ
export function subscribePanmatz(userId, onChange) {
  if (!supabase || !userId) return () => {};
  const channel = supabase
    .channel(`panmatz-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TABLE,
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        const row = payload.new;
        if (!row || !row.date) return;
        try {
          if (await mergeRemoteRows([row])) onChange();
        } catch {
          // יימשך בסנכרון הבא
        }
      },
    )
    .subscribe((status) => {
      // אחרי חיבור (או חיבור מחדש) — משלימים את מה שפוספס
      if (status === "SUBSCRIBED") {
        syncPanmatz().then((changed) => changed && onChange());
      }
    });
  return () => {
    supabase.removeChannel(channel);
  };
}
