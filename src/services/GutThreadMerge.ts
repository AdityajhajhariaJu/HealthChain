import type { GutQuestionThread } from './GutResolutionService';

/** Merge whole question records by their own edit time, not the enclosing profile snapshot time. */
export function mergeGutThreads(
  local: unknown,
  remote: unknown,
  ownerKey: string,
  profileId: string,
): GutQuestionThread[] {
  const valid = (value: unknown): value is GutQuestionThread => {
    if (!value || typeof value !== 'object') return false;
    const item = value as Partial<GutQuestionThread>;
    return item.schemaVersion === 1 && item.ownerKey === ownerKey && item.profileId === profileId
      && typeof item.id === 'string' && !!item.id && typeof item.updatedAt === 'string'
      && Number.isFinite(Date.parse(item.updatedAt)) && typeof item.question === 'string'
      && Array.isArray(item.excludedMealIds)
      && ['understand', 'decide', 'now', 'care'].includes(item.intent || '')
      && ['unspecified', 'bloating', 'discomfort', 'reflux', 'nausea', 'bowel_changes'].includes(item.symptom || '');
  };
  const merged = new Map<string, GutQuestionThread>();
  for (const source of [remote, local]) {
    if (!Array.isArray(source)) continue;
    for (const item of source) {
      if (!valid(item)) continue;
      const previous = merged.get(item.id);
      if (!previous || item.updatedAt > previous.updatedAt) merged.set(item.id, item);
    }
  }
  return [...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
}
