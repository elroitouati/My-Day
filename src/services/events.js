// אירוע "הנתונים השתנו" — המסכים נרשמים ומרעננים את עצמם.
const listeners = new Set();

export function onDataChanged(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitDataChanged() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // מאזין שנכשל לא מפיל את האחרים
    }
  });
}

// מריץ פונקציה אסינכרונית אחת בכל פעם; קריאות שמגיעות בזמן ריצה מתאחדות לריצה אחת נוספת
export function coalesce(fn) {
  let running = null;
  let again = false;
  const run = async () => {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      try {
        do {
          again = false;
          await fn();
        } while (again);
      } finally {
        running = null;
      }
    })();
    return running;
  };
  return run;
}
