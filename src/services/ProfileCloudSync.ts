import { captureAccountScope, isAccountScopeCurrent } from './AccountScope';
import { mergeConnectedProfiles } from './ConnectedProfileMerge';
import { cleanProfile, legacyProfileData } from './ProfileFieldMerge';
import { acceptProfileSync } from './ProfileSyncBaseline';
import { supabase } from './supabaseClient';
export async function sendProfileSnapshot(entry: any) {
  const scope = captureAccountScope();
  const profileId = entry.kind === 'profile_upsert' ? 'profile_1' : entry.payload.profile_id;
  const local = entry.kind === 'profile_upsert' ? legacyProfileData(entry.payload) : cleanProfile(entry.payload.data);
  if (scope.accountId !== entry.userId || !/^profile_\d+$/.test(profileId) ||
      !local || typeof local !== 'object' || Array.isArray(local) ||
      (entry.kind === 'profile_upsert' ? entry.payload.id : entry.payload.user_id) !== entry.userId)
    return { error: new Error('Invalid profile sync owner') };
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!isAccountScopeCurrent(scope)) return { error: new Error('Account changed during profile sync') };
    const snapshot = await supabase.from('healthchain_profiles').select('data,updated_at')
      .eq('user_id', entry.userId).eq('profile_id', profileId).maybeSingle();
    if (snapshot.error) return { error: snapshot.error };
    const legacy = profileId === 'profile_1'
      ? await supabase.from('profiles').select('*').eq('id', entry.userId).maybeSingle()
      : { data: null, error: null };
    if (legacy.error) return { error: legacy.error };
    const remote = { ...(snapshot.data?.data || {}),
      ...(!snapshot.data || Date.parse(legacy.data?.updated_at || '') > Date.parse(snapshot.data.updated_at || '') ? legacyProfileData(legacy.data) : {}) };
    const result = mergeConnectedProfiles(entry.payload._sync_base, local, remote, entry.userId, profileId);
    if (result.conflicts.length) return { error: Object.assign(new Error('Profile field conflict needs review'), {
      conflictRemote: { data: cleanProfile(remote), merged: result.merged, fields: result.conflicts },
    }) };
    if (!isAccountScopeCurrent(scope)) return { error: new Error('Account changed during profile sync') };
    const sent = await supabase.rpc('sync_health_profile_snapshot', {
      p_profile_id: profileId, p_expected_data: snapshot.data?.data ?? null,
      p_expected_legacy_at: legacy.data?.updated_at ?? null, p_data: result.merged,
    });
    if (sent.error) return { error: sent.error }; // Never fall back to a blind upsert.
    if (sent.data?.success) {
      if (isAccountScopeCurrent(scope)) acceptProfileSync(entry.userId, profileId, local, sent.data.data || result.merged);
      return { error: null, profileAcknowledgement: { profileId, local, cloud: sent.data.data || result.merged } };
    }
    if (!sent.data?.conflict) return { error: new Error('Profile sync was not acknowledged') };
  }
  return { error: new Error('Profile changed while syncing. Your edit remains saved for retry.') };
}
