import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const triggerHapticLight = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {
    // Ignore if not on a device that supports it
  }
};

export const triggerHapticMedium = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (e) {
    // Ignore
  }
};

export const triggerHapticSuccess = async () => {
  try {
    await Haptics.notification({ type: 'SUCCESS' as any });
  } catch (e) {
    // Ignore
  }
};
