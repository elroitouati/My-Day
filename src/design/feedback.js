// רטט ואנימציות — דרך כאן בלבד, כדי שאפשר יהיה לכבות אותם בהגדרות.
import * as Haptics from 'expo-haptics';
import { prefs } from './tokens';

export const haptic = {
  tap: () => prefs.haptics && Haptics.selectionAsync().catch(() => {}),
  light: () => prefs.haptics && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  medium: () => prefs.haptics && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  success: () => prefs.haptics && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
};

// אנימציית כניסה/מעבר — או כלום כשהאנימציות כבויות
export const motion = (anim) => (prefs.motion ? anim : undefined);
