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

let pushListenersSetUp = false;
let registeredToken: string | null = null;
let registeredUserId: string | null = null;

export const unregisterPushDevice = async () => {
  if (Capacitor.getPlatform() === 'web') return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || registeredUserId;
    if (userId) {
      let query = supabase.from('user_devices').delete().eq('user_id', userId);
      if (registeredToken) query = query.eq('push_token', registeredToken);
      const { error } = await query;
      if (error) console.warn('Failed to remove push device registration:', error);
    }
    await PushNotifications.unregister();
  } catch (error) {
    console.warn('Failed to unregister push notifications:', error);
  } finally {
    registeredToken = null;
    registeredUserId = null;
  }
};

export const setupPushListeners = () => {
  if (Capacitor.getPlatform() === 'web') return;
  if (pushListenersSetUp) return;
  pushListenersSetUp = true;

  PushNotifications.addListener('registration', async (token) => {
    if (import.meta.env.DEV) console.log('Push registration success');
    
    // Save to Supabase
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        registeredToken = token.value;
        registeredUserId = session.user.id;
        await supabase
          .from('user_devices')
          .upsert(
            { user_id: session.user.id, push_token: token.value, platform: Capacitor.getPlatform(), updated_at: new Date().toISOString() },
            { onConflict: 'user_id,push_token' }
          );
      }
    } catch (err) {
      console.warn('Failed to sync push device registration to Supabase:', err);
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
