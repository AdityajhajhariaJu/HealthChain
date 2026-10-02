import { get, del } from 'idb-keyval';
import { setOwned } from './OwnedIdb';
import { isErasedStorageKey } from './DurableHealthStorage';
import { getProfileEngineState, getProfileKey } from './ProfileEngine';
import type { ClinicalReviewFocus } from './clinicalReview';

export interface ClinicalIntakeDraft {
  history: string;
  step: number;
  focus: ClinicalReviewFocus;
  isolated: boolean;
  files: Array<{ file: File; base64: string; size: number }>;
}
export const clinicalDraftKey = (caseId: string) =>
  `hc_clinical_intake_draft:${getProfileKey()}:${getProfileEngineState()?.activeId || 'profile_1'}:${caseId || 'new'}`;
const writes = new Map<string, Promise<void>>();
const fileBytes = new WeakMap<File, Promise<ArrayBuffer>>();
const readBytes = (file: File) =>
  file.arrayBuffer
    ? file.arrayBuffer()
    : new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(new Error('Could not save the staged file.'));
        reader.readAsArrayBuffer(file);
      });
// A staged original is immutable. Reuse its bytes while notes and options change.
const bytesOf = (file: File) => {
  let bytes = fileBytes.get(file);
  if (!bytes) {
    bytes = readBytes(file);
    fileBytes.set(file, bytes);
  }
  return bytes;
};
const encoded = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('Could not restore the staged file.'));
    reader.readAsDataURL(file);
  });

/** Serialize writes so an older attachment read cannot overwrite a newer draft. */
export function saveClinicalIntakeDraft(
  key: string,
  draft: ClinicalIntakeDraft | null
): Promise<void> {
  const work = (writes.get(key) || Promise.resolve())
    .catch(() => {})
    .then(async () => {
      if (!draft) {
        await del(key);
        return;
      }
      if (isErasedStorageKey(key))
        throw new Error('This account’s local data is being erased. The intake was not saved.');
      const files = await Promise.all(
        draft.files.map(async ({ file }) => ({
          name: file.name,
          type: file.type,
          modified: file.lastModified,
          bytes: await bytesOf(file),
        }))
      );
      await setOwned(key, {
        version: 1,
        history: draft.history,
        step: draft.step,
        focus: draft.focus,
        isolated: draft.isolated,
        files,
      });
      if (isErasedStorageKey(key))
        throw new Error('This account’s local data is being erased. The intake was not saved.');
    });
  writes.set(key, work);
  void work.then(
    () => {
      if (writes.get(key) === work) writes.delete(key);
    },
    () => {
      if (writes.get(key) === work) writes.delete(key);
    }
  );
  return work;
}

export async function loadClinicalIntakeDraft(key: string): Promise<ClinicalIntakeDraft | null> {
  await writes.get(key);
  const stored: any = await get(key);
  if (!stored) return null;
  if (
    stored.version !== 1 ||
    typeof stored.history !== 'string' ||
    !Array.isArray(stored.files) ||
    stored.files.length > 10
  )
    throw new Error('The draft could not be restored. Your saved cases are still available.');
  const files = await Promise.all(
    stored.files.map(async (item: any) => {
      if (
        !(item.bytes instanceof ArrayBuffer) ||
        !item.bytes.byteLength ||
        item.bytes.byteLength > 3 * 1024 * 1024 ||
        typeof item.name !== 'string' ||
        !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(item.type)
      )
        throw new Error('A draft attachment is unavailable. Reattach the original.');
      const file = new File([item.bytes], item.name, {
        type: item.type,
        lastModified: item.modified,
      });
      fileBytes.set(file, Promise.resolve(item.bytes));
      return { file, base64: await encoded(file), size: file.size };
    })
  );
  if (files.reduce((size, item) => size + item.base64.length, 0) > 3_500_000)
    throw new Error(
      'The saved attachments exceed the combined upload limit. Reattach fewer originals.'
    );
  return {
    history: stored.history,
    step: Number.isInteger(stored.step) && stored.step >= 1 && stored.step <= 6 ? stored.step : 1,
    focus: ['differential', 'doctor_prep', 'lab_second_opinion'].includes(stored.focus)
      ? stored.focus
      : 'differential',
    isolated: stored.isolated === true,
    files,
  };
}
