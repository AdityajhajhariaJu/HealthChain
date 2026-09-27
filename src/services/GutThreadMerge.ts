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
      if (!previous) { merged.set(item.id, item); continue; }
      const latest = item.updatedAt > previous.updatedAt ? item : previous;
      const activity = new Map([...(previous.activity || []), ...(item.activity || [])]
        .filter((event) => event && typeof event.id === 'string').map((event) => [event.id, event]));
      merged.set(item.id, { ...latest, activity: [...activity.values()].sort((a, b) => a.at.localeCompare(b.at)).slice(-120) });
    }
  }
  return [...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
}
