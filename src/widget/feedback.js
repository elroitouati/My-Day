// משוב כשמסמנים V בווידג'ט: רטט קצר ו/או צליל. עובד גם כשהאפליקציה סגורה.
import { Vibration } from 'react-native';
import { Audio } from 'expo-av';

const CHECK_SOUND = require('../../assets/sounds/check.wav');

export function checkFeedback(prefs, done) {
  if (prefs.haptic) {
    try {
      // סימון: "טיק-טיק" כפול; ביטול: טיק אחד עדין
      Vibration.vibrate(done ? [0, 18, 70, 28] : [0, 14]);
    } catch {}
  }
  if (prefs.sound && done) playCheckSound();
}

export async function playCheckSound() {
  try {
    const { sound } = await Audio.Sound.createAsync(CHECK_SOUND, {
      shouldPlay: true,
      volume: 0.8,
    });
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.didJustFinish) sound.unloadAsync().catch(() => {});
    });
  } catch (e) {
    console.warn('צליל הסימון נכשל', e);
  }
}
