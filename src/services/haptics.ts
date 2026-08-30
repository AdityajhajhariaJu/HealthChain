import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const triggerHapticLight = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10); // Very brief, soothing vibration fallback for Android Web
    }
  }
};

export const triggerHapticHeavy = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (e) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }
  }
};

export const triggerHapticMedium = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (e) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
  }
};

export const triggerHapticSuccess = async () => {
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
  try {
    await Haptics.notification({ type: 'WARNING' as any });
  } catch (e) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    }
  }
};

// Global initializer for that premium native feel
export const initGlobalHaptics = () => {
  if (typeof window === 'undefined') return;

  // Add a listener to the document to catch clicks on interactive elements
  document.addEventListener('pointerdown', (e) => {
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
