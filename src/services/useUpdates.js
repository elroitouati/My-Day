// hook למצב העדכונים — לפס העליון ולמסך ההגדרות
import { useEffect, useState } from 'react';
import { getUpdateState, subscribeUpdates } from './updates';

export { checkForUpdate, applyUpdate, currentBuildDate, updatesEnabled } from './updates';

export function useUpdateState() {
  const [s, setS] = useState(getUpdateState());
  useEffect(() => subscribeUpdates(setS), []);
  return s;
}
