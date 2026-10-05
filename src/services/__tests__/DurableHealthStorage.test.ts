// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { isDurableHealthStorageKey, isOwnerStorageKey, retainHealthStorage } from '../DurableHealthStorage';
describe('logout preserves unsynced owned records', () => {
  it('retains local records even when no outbox copy was written, while dropping credentials', () => {
    localStorage.clear();
    const records = {
      'hc_adult_eligibility_account-a': '{"minimumAge":18,"confirmed":true}',
      hc_unified_profile_account_a: '{"pendingProfile":true}',
      hc_cases_account_a_profile_1: '[{"unsyncedCase":true}]',
      'hc_observations_v1:account-a:profile_1': '[{"queueFailed":true}]',
      hc_ava_messages_account_a_profile_1: '[{"localOnlyReply":true}]',
      'hc_medication_schedule_linked:hc_unified_profile_account-a:profile_1': 'true',
      'healthchain_hydration_data_2026-10-01:hc_unified_profile_account-a:profile_1':
        '{"currentMl":300}',
      'healthchain_vitamins_taken_logs_2026-10-01:hc_unified_profile_account-a:profile_1':
        '{"dose-a":true}',
      'hc_progress_photo:hc_unified_profile_account-a:profile_1':
        'data:image/png;base64,original-photo',
      'hc_pending_charge_account-a': '{"orderId":"pending-owner-receipt"}',
      'hc_interrupted_task_account-a': '{"returnPath":"/app/ava"}',
    };
    Object.entries({
      ...records,
      hc_account: '{"id":"account-a"}',
      isAuthenticated: 'true',
      'sb-project-auth-token': 'private-token',
      hc_temporary_patient_cache: 'temporary',
    }).forEach(([key, value]) => localStorage.setItem(key, value));
    expect(retainHealthStorage(localStorage)).toEqual(records);
  });
  it('keeps deletion tombstones and durable queue entries, but not authentication IDB keys', () => {
    expect(isDurableHealthStorageKey('hc_tombstones_account-a_profile_1')).toBe(true);
    expect(isDurableHealthStorageKey('hc_sync_outbox_account-a')).toBe(true);
    expect(isDurableHealthStorageKey('hc_auth_idb_token')).toBe(false);
    expect(
      isDurableHealthStorageKey(
        'hc_clinical_intake_draft:hc_unified_profile_account-a:profile_1:new'
      )
    ).toBe(true);
  });
  it('includes adult confirmation in erasure for its exact owner only', () => {
    expect(isOwnerStorageKey('hc_adult_eligibility_account-a', 'account-a')).toBe(true);
    expect(isOwnerStorageKey('hc_adult_eligibility_account-ab', 'account-a')).toBe(false);
    expect(isOwnerStorageKey('hc_adult_eligibility_guest', 'account-a')).toBe(false);
  });
});
