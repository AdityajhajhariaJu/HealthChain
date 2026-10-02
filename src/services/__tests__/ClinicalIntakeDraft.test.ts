// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
const disk = vi.hoisted(() => new Map<string, unknown>());
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key) => disk.get(key)),
  set: vi.fn(async (key, value) => {
    disk.set(key, value);
  }),
  del: vi.fn(async (key) => {
    disk.delete(key);
  }),
}));
vi.mock('../ProfileEngine', () => ({
  getProfileKey: () => 'hc_unified_profile_draft-test',
  getProfileEngineState: () => ({ activeId: 'profile_1' }),
}));
import {
  clinicalDraftKey,
  loadClinicalIntakeDraft,
  saveClinicalIntakeDraft,
} from '../ClinicalIntakeDraft';
import { blockErasedOwner, isOwnerStorageKey } from '../DurableHealthStorage';

describe('interrupted Clinical intake', () => {
  beforeEach(() => disk.clear());
  it('serializes overlapping saves and preserves the original bytes and MIME', async () => {
    let finish!: (bytes: ArrayBuffer) => void;
    const file = new File([new Uint8Array([0, 10, 250])], 'original.png', { type: 'image/png' });
    const read = vi.fn(
      () =>
        new Promise<ArrayBuffer>((resolve) => {
          finish = resolve;
        })
    );
    Object.defineProperty(file, 'arrayBuffer', { value: read });
    const key = clinicalDraftKey('case-1');
    const draft = {
      history: 'Earlier notes',
      step: 4,
      focus: 'differential' as const,
      isolated: false,
      files: [{ file, base64: 'AAr6', size: 3 }],
    };
    const earlier = saveClinicalIntakeDraft(key, draft);
    const latest = saveClinicalIntakeDraft(key, {
      ...draft,
      history: 'Corrected notes',
      step: 6,
      focus: 'doctor_prep',
      isolated: true,
    });
    await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());
    finish(new Uint8Array([0, 10, 250]).buffer);
    await Promise.all([earlier, latest]);
    const restored = await loadClinicalIntakeDraft(key);
    expect(restored).toMatchObject({
      history: 'Corrected notes',
      step: 6,
      focus: 'doctor_prep',
      isolated: true,
    });
    expect(restored!.files[0]).toMatchObject({ base64: 'AAr6', size: 3 });
    expect(restored!.files[0].file.type).toBe('image/png');
    expect(read).toHaveBeenCalledOnce();
    await saveClinicalIntakeDraft(key, null);
    expect(await loadClinicalIntakeDraft(key)).toBeNull();
  });
  it('matches the exact owner for erasure and cannot claim an erased intake was saved', async () => {
    const key = 'hc_clinical_intake_draft:hc_unified_profile_draft-a:profile_1:new';
    expect(isOwnerStorageKey(key, 'draft-a')).toBe(true);
    expect(isOwnerStorageKey(key, 'draft')).toBe(false);
    blockErasedOwner('draft-a');
    await expect(
      saveClinicalIntakeDraft(key, {
        history: 'Notes',
        step: 2,
        focus: 'differential',
        isolated: false,
        files: [],
      })
    ).rejects.toThrow('not saved');
    expect(disk.has(key)).toBe(false);
  });
});
