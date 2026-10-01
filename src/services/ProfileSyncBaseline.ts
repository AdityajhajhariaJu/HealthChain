import { captureAccountScope } from './AccountScope';
import { mergeConnectedProfiles } from './ConnectedProfileMerge';
import { applyProfileChoice, cleanProfile } from './ProfileFieldMerge';
import { getItemSync, setItemSync } from './storage';
export const profileBaselineKey = (owner: string, profile: string) => `hc_profile_sync_base:${owner}:${profile}`;
export function readProfileBaseline(owner: string, profile: string): any | undefined {
  try { const raw = getItemSync(profileBaselineKey(owner, profile)); return raw ? JSON.parse(raw) : undefined; } catch { return undefined; }
}
export function rememberProfileBaseline(owner: string, profile: string, data: any) {
  setItemSync(profileBaselineKey(owner, profile), JSON.stringify(cleanProfile(data)));
}
/** Rebase newer local edits against an acknowledged snapshot; never overwrite edits made in flight. */
export function acceptProfileSync(owner: string, profile: string, sent: any, cloud: any) {
  rebaseDeviceProfile(owner, profile, sent, cloud);
  rememberProfileBaseline(owner, profile, cloud);
  window.dispatchEvent(new Event('hc_profile_updated'));
}
export function rebaseDeviceProfile(owner: string, profile: string, sent: any, cloud: any) {
  if (captureAccountScope().accountId !== owner) return;
  const key = `hc_unified_profile_${owner}`;
  const raw = getItemSync(key);
  if (raw) {
    const state = JSON.parse(raw), local = state.profiles?.[profile];
    if (local) {
      const rebased = mergeConnectedProfiles(sent, local, cloud, owner, profile);
      // An edit made locally during send stays local until its queued baseline is merged.
      let merged = rebased.merged;
      for (const field of rebased.conflicts) merged = applyProfileChoice(merged, field, 'local');
      state.profiles[profile] = { ...local, ...merged, id: profile };
      setItemSync(key, JSON.stringify(state));
    }
  }
}
