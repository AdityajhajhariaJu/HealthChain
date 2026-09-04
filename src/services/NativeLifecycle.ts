import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { flushSyncOutbox } from './SyncOutbox';

let isNativeLifecycleInitialized = false;

/**
 * Initializes mobile native lifecycle handlers on iOS and Android:
 * - Dismisses splash screen safely once React mounts
 * - Handles Android physical/gesture back button (modal dismiss -> history back -> app minimize)
 * - Auto-flushes sync outbox when app resumes from background
 * - Configures keyboard resize behavior
 */
export function initNativeLifecycle() {
  if (isNativeLifecycleInitialized) return;
  isNativeLifecycleInitialized = true;

  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // 1. Dismiss splash screen smoothly
  try {
    SplashScreen.hide().catch(() => {});
  } catch (e) {
    // Ignore if unsupported
  }

  // 2. Android Hardware / Gesture Back Button Handling
  try {
    App.addListener('backButton', ({ canGoBack }) => {
      // Priority A: Check if any modal, alert, or slide drawer is currently open
      const openModal = document.querySelector('[role="dialog"], [aria-modal="true"], .modal-open, .drawer-open');
      if (openModal) {
        // Dispatch synthetic Escape key event to trigger modal dismissal handlers
        const escapeEvent = new KeyboardEvent('keydown', {
          key: 'Escape',
          code: 'Escape',
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true
        });
        window.dispatchEvent(escapeEvent);
        return;
      }

      // Priority B: If history can go back and not already at root/dashboard
      const path = window.location.pathname;
      const isRoot = path === '/' || path === '/app' || path === '/app/today';
      if (canGoBack && !isRoot) {
        window.history.back();
        return;
      }

      // Priority C: At root screen, minimize app rather than hard-killing process
      App.minimizeApp().catch(() => {
        App.exitApp().catch(() => {});
      });
    });
  } catch (e) {
    console.warn('[NativeLifecycle] Failed to register backButton listener', e);
  }

  // 3. Background-to-Foreground Resume Sync
  try {
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        // App just entered active foreground — flush any queued outbox items
        flushSyncOutbox().catch((err) => {
          console.warn('[NativeLifecycle] Auto-flush on resume failed:', err);
        });
      }
    });
  } catch (e) {
    console.warn('[NativeLifecycle] Failed to register appStateChange listener', e);
  }

  // 4. Keyboard Ergonomics for Mobile Viewports
  try {
    Keyboard.setResizeMode({ mode: KeyboardResize.Body }).catch(() => {});
    if (Capacitor.getPlatform() === 'ios') {
      Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => {});
    }
  } catch (e) {
    // Graceful fallback if unsupported
  }
}
