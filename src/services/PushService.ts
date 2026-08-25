import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabaseClient';
import { Capacitor } from '@capacitor/core';

export const registerPushNotifications = async () => {
  if (Capacitor.getPlatform() === 'web') return;

  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      if (import.meta.env.DEV) console.log('Push notification permissions not granted');
      return;
    }

    await PushNotifications.register();
  } catch (e) {
    console.warn('Push notification registration failed', e);
  }
};

export const setupPushListeners = () => {
  if (Capacitor.getPlatform() === 'web') return;

  PushNotifications.addListener('registration', async (token) => {
    if (import.meta.env.DEV) console.log('Push registration success');
    
    // Save to Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('user_devices')
        .upsert(
          { user_id: session.user.id, push_token: token.value, platform: Capacitor.getPlatform(), updated_at: new Date().toISOString() },
          { onConflict: 'user_id,push_token' }
        );
    }
  });

  PushNotifications.addListener('registrationError', (error: any) => {
    console.error('Error on registration: ' + JSON.stringify(error));
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    if (import.meta.env.DEV) console.log('Push received');
    // Could dispatch custom event to update UI
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    if (import.meta.env.DEV) console.log('Push action performed');
  });
};
