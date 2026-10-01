import * as idb from 'idb-keyval';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { blockErasedOwner, isOwnerStorageKey, pendingErasedOwners } from './DurableHealthStorage';
import { invalidateAccountScope } from './AccountScope';
import { flushNativeStorage } from './storage';
import { flushOwnedWrites } from './OwnedIdb';
const receiptKey = 'hc_erasure_pending_owners';
/** Contains only owner IDs; permits device cleanup after the remote identity is gone. */
export async function recordConfirmedAccountErasure(ownerId: string) {
  if (!ownerId || ownerId === 'guest') throw new Error('Invalid erasure receipt.');
  blockErasedOwner(ownerId);
  const value = JSON.stringify([...new Set([...pendingErasedOwners(), ownerId])]);
  localStorage.setItem(receiptKey, value);
  if (Capacitor.getPlatform() !== 'web') await Preferences.set({ key: receiptKey, value });
}

/** Only call after the authenticated server has confirmed deletion. */
export async function eraseOwnerHealthData(ownerId: string) {
  if (!ownerId || ownerId === 'guest') throw new Error('Sign in again before deleting your account.');
  blockErasedOwner(ownerId);
  invalidateAccountScope();
  window.dispatchEvent(new CustomEvent('hc_owner_erased', { detail: { ownerId } }));
  await flushOwnedWrites();
  await flushNativeStorage().catch(() => {});
  for (const key of Object.keys(localStorage)) {
    if (isOwnerStorageKey(key, ownerId)) localStorage.removeItem(key);
  }
  for (const key of await idb.keys()) {
    if (isOwnerStorageKey(key, ownerId)) await idb.del(key);
  }
  if (Capacitor.getPlatform() !== 'web') {
    for (const key of (await Preferences.keys()).keys) {
      if (isOwnerStorageKey(key, ownerId)) await Preferences.remove({ key });
    }
  }
  const remaining = (await idb.keys()).filter(key => isOwnerStorageKey(key, ownerId));
  if (remaining.length || Object.keys(localStorage).some(key => isOwnerStorageKey(key, ownerId)))
    throw new Error('Your account was deleted, but some device records could not be removed. Retry device cleanup.');
  const value = JSON.stringify(pendingErasedOwners().filter(owner => owner !== ownerId));
  if (Capacitor.getPlatform() !== 'web') await Preferences.set({ key: receiptKey, value });
  localStorage.setItem(receiptKey, value);
  window.dispatchEvent(new Event('hc_erasure_cleanup_complete'));
}
