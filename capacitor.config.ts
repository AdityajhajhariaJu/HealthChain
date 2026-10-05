import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.healthchain.app',
  appName: 'HealthChain',
  webDir: 'dist-native',
  loggingBehavior: 'debug',
  server: { androidScheme: 'https', iosScheme: 'capacitor' },
  plugins: {
    StatusBar: { style: 'dark', backgroundColor: '#0F172A' },
    SplashScreen: { launchShowDuration: 2000, backgroundColor: '#0F172A', showSpinner: false },
    Keyboard: { resize: KeyboardResize.Body, resizeOnFullScreen: true },
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert', 'banner', 'list'] },
    LocalNotifications: { presentationOptions: ['badge', 'sound', 'banner', 'list'] },
  },
};

export default config;
