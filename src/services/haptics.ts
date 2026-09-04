import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { getItemSync } from './storage';

export const isHapticsEnabled = (): boolean => {
  try {
    return getItemSync('hc_haptics_enabled') !== 'false';
  } catch {
    return true;
  }
};

export const triggerHapticLight = async () => {
  if (!isHapticsEnabled()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10); // Very brief, soothing vibration fallback for Android Web
    }
  }
};

export const triggerHapticHeavy = async () => {
  if (!isHapticsEnabled()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (e) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }
  }
};

export const triggerHapticMedium = async () => {
  if (!isHapticsEnabled()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (e) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
  }
};

export const triggerHapticSuccess = async () => {
  if (!isHapticsEnabled()) return;
  try {
    // Note: Some Capacitor versions use NotificationType enum
    await Haptics.notification({ type: 'SUCCESS' as any });
  } catch (e) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([20, 50, 20]);
    }
  }
};

export const triggerHapticWarning = async () => {
  if (!isHapticsEnabled()) return;
  try {
    await Haptics.notification({ type: 'WARNING' as any });
  } catch (e) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    }
  }
};

/** Feather tick for tabs, pill selections, and micro-switches */
export const triggerHapticSelection = async () => {
  if (!isHapticsEnabled()) return;
  try {
    if ((Haptics as any).selectionChanged) {
      await (Haptics as any).selectionChanged();
    } else {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  } catch (e) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(8);
    }
  }
};

/** Soft pop for bottom sheets, drawers, and modal transitions */
export const triggerHapticModal = async () => {
  if (!isHapticsEnabled()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (e) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(18);
    }
  }
};

/** Dual-pulse rhythmic heartbeat signature for vital events and breathing peaks */
export const triggerHapticHeartbeat = async () => {
  if (!isHapticsEnabled()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
    setTimeout(async () => {
      try {
        if (!isHapticsEnabled()) return;
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch {
        // ignore
      }
    }, 90);
  } catch (e) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([12, 60, 20]);
    }
  }
};

/** Crisp micro-tick for timer decrements, sliders, and audio frequency dials */
export const triggerHapticTick = async () => {
  if (!isHapticsEnabled()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(6);
    }
  }
};

let hasInitializedGlobalHaptics = false;

// Global initializer for that premium native feel
export const initGlobalHaptics = () => {
  if (typeof window === 'undefined' || hasInitializedGlobalHaptics) return;
  hasInitializedGlobalHaptics = true;

  // Add a listener to the document to catch clicks on interactive elements
  document.addEventListener('pointerdown', (e) => {
    if (!isHapticsEnabled()) return;
    const target = e.target as HTMLElement;
    
    // Check if the target or any of its parents is a button or link
    const isClickable = target.closest('button') || 
                        target.closest('a') || 
                        target.closest('[role="button"]') ||
                        target.closest('.mobile-tab');
                        
    if (isClickable) {
      // Don't trigger if disabled
      if (isClickable.hasAttribute('disabled') || isClickable.getAttribute('aria-disabled') === 'true') {
        return;
      }
      triggerHapticLight();
    }
  }, { passive: true });
};
