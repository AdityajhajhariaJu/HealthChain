import { describe, it, expect } from 'vitest';
import { evaluateEmergencyTriage } from '../clinicalTriageEngine';
import { generateDoctorSummary } from '../TriggerEngine';
import { getDeterministicMedicineData } from '../clinicalPharmacyData';
import { getClinicalDietarySwap } from '../clinicalDietarySwaps';

describe('Clinical Emergency Triage Engine', () => {
  it('should immediately detect cerebrovascular emergency (thunderclap headache)', () => {
    const res = evaluateEmergencyTriage('I have a sudden thunderclap headache and my neck feels stiff');
    expect(res.isEmergency).toBe(true);
    expect(res.category).toBe('CEREBROVASCULAR');
    expect(res.suggestedContact).toBe('');
  });

  it('should immediately detect acute coronary syndrome (crushing chest pain radiating to arm)', () => {
    const res = evaluateEmergencyTriage('Experiencing crushing chest pain radiating to left arm with cold sweats');
    expect(res.isEmergency).toBe(true);
    expect(res.category).toBe('CARDIOVASCULAR');
    expect(res.suggestedContact).toBe('');
  });

  it('should immediately detect stroke symptoms (facial droop and slurred speech)', () => {
    const res = evaluateEmergencyTriage('Sudden facial droop and my left arm has one sided weakness');
    expect(res.isEmergency).toBe(true);
    expect(res.category).toBe('CEREBROVASCULAR');
  });

  it('should immediately detect psychiatric crisis without assuming the user is in the US', () => {
    const res = evaluateEmergencyTriage('I feel overwhelmed and have suicidal thoughts right now');
    expect(res.isEmergency).toBe(true);
    expect(res.category).toBe('PSYCHIATRIC_CRISIS');
    expect(res.suggestedContact).toBe('');
  });

  it('should NOT flag benign chronic symptoms as emergencies', () => {
    const benignCases = [
      'I have a mild tension headache after staring at my laptop',
      'Feeling slightly bloated after eating sourdough bread',
      'Lower back feels a bit stiff after 3 hours of sitting',
      'Should I take magnesium glycinate before sleeping?'
    ];

    for (const text of benignCases) {
      const res = evaluateEmergencyTriage(text);
      expect(res.isEmergency).toBe(false);
    }
  });
});

describe('Physician Dossier & SBAR Generation', () => {
  it('should generate structured SBAR clinical brief with high-yield clinician questions', () => {
    const summary = generateDoctorSummary();
    expect(summary).toBeDefined();
    expect(summary.sbarSummary).toBeDefined();
    expect(summary.sbarSummary.situation).toBeDefined();
    expect(summary.sbarSummary.background).toBeDefined();
    expect(summary.sbarSummary.assessment).toBeDefined();
    expect(summary.sbarSummary.recommendation).toBeDefined();
    expect(summary.clinicalRecommendations.length).toBeGreaterThan(0);
  });
});

describe('Source-gated medicine lookup', () => {
  it.each(['metformin', 'Prilosec', 'Lipitor', 'Zoloft'])('does not surface unreviewed supplement and dose claims for %s', (name) => {
    const data = getDeterministicMedicineData(name);
    expect(data).not.toBeNull();
    expect(data?.reviewerStatus).toBe('not_clinically_reviewed');
    expect(data?.nutrientDepletions).toEqual([]);
    expect(data?.supplementInteractions).toEqual([]);
    expect(data?.alternatives).toEqual([]);
  });

  it('only shows the narrow label-checked tablet rule for the exact generic name', () => {
    const data = getDeterministicMedicineData('levothyroxine');
    expect(data?.reviewerStatus).toBe('label_checked_not_clinician_reviewed');
    expect(data?.optimalTiming.criticalSpacingRules[0]).toContain('calcium carbonate');
    expect(data?.sourceLabelUrl).toContain('dailymed.nlm.nih.gov');
    expect(getDeterministicMedicineData('unknown levothyroxine liquid')).toBeNull();
  });
});

describe('Unreviewed automatic dietary swaps', () => {
  it('does not suggest a substitution or relief timeline from a food name', () => {
    expect(getClinicalDietarySwap('Oats')).toBeNull();
    expect(getClinicalDietarySwap('garlic')).toBeNull();
    expect(getClinicalDietarySwap('whey protein')).toBeNull();
  });
});
