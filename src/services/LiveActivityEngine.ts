import { Capacitor } from '@capacitor/core';

export class LiveActivityEngine {
  static async startProtocol(title: string, durationMinutes: number) {
    if (Capacitor.getPlatform() !== 'ios') {
      if (import.meta.env.DEV) console.log('Live Activities only supported on iOS native.');
      return;
    }

    try {
      // Stub for actual Capacitor Live Activities plugin (e.g. @capgo/live-activity)
      if (import.meta.env.DEV) console.log(`Starting Live Activity on iOS Lock Screen: ${title} for ${durationMinutes} mins`);
      // await LiveActivity.start({
      //   template: 'protocol_timer',
      //   data: { title, endTime: Date.now() + durationMinutes * 60000 }
      // });
    } catch (e) {
      console.error('Failed to start Live Activity', e);
    }
  }

  static async endProtocol() {
    if (Capacitor.getPlatform() !== 'ios') return;
    try {
      if (import.meta.env.DEV) console.log('Ending Live Activity');
      // await LiveActivity.endAll();
    } catch (e) {}
  }
}