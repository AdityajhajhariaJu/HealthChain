import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.healthchain.app',
  appName: 'HealthChain',
  webDir: 'dist',
  server: { androidScheme: 'https', iosScheme: 'https' },
  plugins: {
    StatusBar: { style: 'dark', backgroundColor: '#0F172A' },
    SplashScreen: { launchShowDuration: 2000, backgroundColor: '#0F172A', showSpinner: false },
    Keyboard: { resize: 'body', resizeOnFullScreen: true },
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
};

export default config;
