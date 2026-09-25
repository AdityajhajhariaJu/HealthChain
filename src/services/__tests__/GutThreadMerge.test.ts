import { describe, expect, it } from 'vitest';
import { mergeGutThreads } from '../GutThreadMerge';
import type { GutQuestionThread } from '../GutResolutionService';

const ownerKey = 'hc_unified_profile_account-a';
const profileId = 'profile_1';
const makeThread = (id: string, updatedAt: string, reflection: string | null = null): GutQuestionThread => ({
  id, schemaVersion: 1, ownerKey, profileId, intent: 'understand',
  question: `Question ${id}`, focus: 'chai', symptom: 'bloating', status: 'open',
  selectedStep: null, reflection, excludedMealIds: [], reviewedEvidence: null,
  createdAt: '2026-09-23T00:00:00.000Z', updatedAt,
});

describe('Gut question merge across profile snapshots', () => {
  it('preserves questions created on separate devices', () => {
    const local = makeThread('local', '2026-09-23T10:00:00.000Z');
    const remote = makeThread('remote', '2026-09-23T11:00:00.000Z');
    expect(mergeGutThreads([local], [remote], ownerKey, profileId).map((item) => item.id))
      .toEqual(['remote', 'local']);
  });

  it('preserves questions saved without a selected symptom', () => {
    const local = { ...makeThread('unspecified', '2026-09-23T12:00:00.000Z'), symptom: 'unspecified' as const };
    expect(mergeGutThreads([local], [], ownerKey, profileId)).toEqual([local]);
    expect(mergeGutThreads([], [local], ownerKey, profileId)).toEqual([local]);
  });

  it('retains the newer reviewed question even when its enclosing profile is older', () => {
    const old = makeThread('shared', '2026-09-23T10:00:00.000Z', 'old reflection');
    const revised = makeThread('shared', '2026-09-23T12:00:00.000Z', 'new reflection');
    expect(mergeGutThreads([old], [revised], ownerKey, profileId)[0].reflection).toBe('new reflection');
    expect(mergeGutThreads([revised], [old], ownerKey, profileId)[0].reflection).toBe('new reflection');
  });

  it('discards threads from another account, profile or unsupported schema', () => {
    const valid = makeThread('valid', '2026-09-23T10:00:00.000Z');
    const otherAccount = { ...valid, id: 'other-account', ownerKey: 'hc_unified_profile_account-b' };
    const otherProfile = { ...valid, id: 'other-profile', profileId: 'profile_2' };
    const unsupported = { ...valid, id: 'unsupported', schemaVersion: 2 };
    expect(mergeGutThreads([valid, otherAccount], [otherProfile, unsupported], ownerKey, profileId))
      .toEqual([valid]);
  });
});
