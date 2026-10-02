import { expect, it } from 'vitest';
import { filterPresetSymptoms, findPresetSymptom } from './clinicalIntakeCatalog';

it('finds clinical aliases across categories and normalizes restored symptom names', () => {
  const found = findPresetSymptom('  DYSPHAGIA  ');
  expect(found).toBeDefined();
  expect(filterPresetSymptoms('dysphagia', 'common')).toContain(found);
  expect(filterPresetSymptoms('  DySpHaGiA  ', 'skin')).toContain(found);
  expect(findPresetSymptom(found!.name)).toBe(found);
  expect(filterPresetSymptoms('', 'common').every((symptom) => symptom.isCommon)).toBe(true);
  expect(filterPresetSymptoms('a completely custom concern', 'all')).toEqual([]);
});
