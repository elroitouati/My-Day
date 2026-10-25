// בוחרי תאריך ושעה — הדיאלוג המקורי של אנדרואיד.
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { dayKey, keyToDate, keyTimeToDate, dateToTime, todayKey } from '../logic/dates';

export function pickDate(currentKey, onPick, { minimumKey } = {}) {
  DateTimePickerAndroid.open({
    value: keyToDate(currentKey || todayKey()),
    mode: 'date',
    minimumDate: minimumKey ? keyToDate(minimumKey) : undefined,
    onChange: (e, d) => {
      if (e.type === 'set' && d) onPick(dayKey(d));
    },
  });
}

export function pickTime(currentTime, onPick) {
  DateTimePickerAndroid.open({
    value: keyTimeToDate(todayKey(), currentTime || '09:00'),
    mode: 'time',
    is24Hour: true,
    onChange: (e, d) => {
      if (e.type === 'set' && d) onPick(dateToTime(d));
    },
  });
}
