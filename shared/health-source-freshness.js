function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value ?? null;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}
export function planningConstraintSnapshot(core, diet) {
  return JSON.stringify(canonical({ allergies: core?.allergies || [], conditions: core?.conditions || [], medications: core?.medications || [],
    demographics: core?.demographics || {}, diet: { goal: diet?.goal, restrictions: diet?.restrictions, practical: diet?.practical,
      cuisine: diet?.cuisine, countryCode: diet?.countryCode, region: diet?.region,
      targetCalories: diet?.targetCalories, targetProtein: diet?.targetProtein, targetCarbs: diet?.targetCarbs, targetFat: diet?.targetFat } }));
}
export function sourceFreshness(snapshots, current) {
  const byId = new Map(current.map(item => [item.id, item]));
  return snapshots.map(source => {
    const item = byId.get(source.id);
    return { id: source.id, revision: source.revision, status: !item ? 'unavailable' : item.deletedAt ? 'deleted' : item.revision !== source.revision ? 'changed' : 'current' };
  });
}
