/** Profile medications are the shared inventory; an exact user-entered time enables tracking. */
export const isMedicationTime = (time: unknown): time is string =>
  typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

export function medicationSlot(time: string): string {
  const hour = Number(time.split(':')[0]);
  return hour < 12 ? 'morning' : hour < 17 ? 'midday' : hour < 21 ? 'evening' : 'bedtime';
}

export function normalizeMedications(value: unknown): any[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    const med = typeof entry === 'string' ? { name: entry } : entry;
    if (!med || typeof med.name !== 'string' || !med.name.trim()) return [];
    const { takenToday: _dailyStatus, ...rest } = med;
    const time = isMedicationTime(med.time) ? med.time : '';
    return [{ ...rest, name: med.name.trim(),
      id: med.id || `med_${index}_${encodeURIComponent(med.name.trim().toLowerCase())}`,
      dosage: med.dosage || '', time, enabled: Boolean(time) && med.enabled !== false,
      ...(time ? { circadianSlot: medicationSlot(time) } : {}) }];
  });
}

/** One-time union preserves old scheduler IDs (and therefore existing daily logs). */
export function mergeLegacyMedicationSchedule(medications: unknown, legacy: unknown): any[] {
  const merged = normalizeMedications(medications);
  const matched = new Set<number>();
  for (const item of normalizeMedications(legacy)) {
    if (['vit_multi', 'vit_d3', 'vit_omega', 'vit_mag'].includes(item.id)) continue;
    let index = merged.findIndex(m => m.id === item.id);
    if (index < 0) index = merged.findIndex((m, i) => !matched.has(i) && m.name.toLowerCase() === item.name.toLowerCase());
    if (index < 0) { index = merged.length; merged.push(item); }
    else merged[index] = { ...merged[index], ...item };
    matched.add(index);
  }
  return merged;
}
