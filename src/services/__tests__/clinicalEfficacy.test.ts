import { describe, it, expect } from 'vitest';
import { evaluateEmergencyTriage } from '../clinicalTriageEngine';
import { evaluateBiomarkerFunctionally } from '../functionalBiomarkers';
import { generateDoctorSummary } from '../TriggerEngine';
import { getDeterministicMedicineData } from '../clinicalPharmacyData';
import { getClinicalDietarySwap } from '../clinicalDietarySwaps';

describe('Clinical Emergency Triage Engine', () => {
  it('should immediately detect cerebrovascular emergency (thunderclap headache)', () => {
    const res = evaluateEmergencyTriage('I have a sudden thunderclap headache and my neck feels stiff');
    expect(res.isEmergency).toBe(true);
    expect(res.category).toBe('CEREBROVASCULAR');
    expect(res.suggestedContact).toBe('911');
  });

  it('should immediately detect acute coronary syndrome (crushing chest pain radiating to arm)', () => {
    const res = evaluateEmergencyTriage('Experiencing crushing chest pain radiating to left arm with cold sweats');
    expect(res.isEmergency).toBe(true);
    expect(res.category).toBe('CARDIOVASCULAR');
    expect(res.suggestedContact).toBe('911');
  });

  it('should immediately detect stroke symptoms (facial droop and slurred speech)', () => {
    const res = evaluateEmergencyTriage('Sudden facial droop and my left arm has one sided weakness');
    expect(res.isEmergency).toBe(true);
    expect(res.category).toBe('CEREBROVASCULAR');
  });

  it('should immediately detect psychiatric crisis with appropriate 988 contact', () => {
    const res = evaluateEmergencyTriage('I feel overwhelmed and have suicidal thoughts right now');
    expect(res.isEmergency).toBe(true);
    expect(res.category).toBe('PSYCHIATRIC_CRISIS');
    expect(res.suggestedContact).toBe('988');
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

describe('Functional Biomarker Intelligence Engine', () => {
  it('should flag occult cellular iron depletion when Ferritin is in broad standard range but below optimal', () => {
    // 22 ng/mL is technically "normal" by standard 15-200 range, but functionally deficient
    const res = evaluateBiomarkerFunctionally('Serum Ferritin', 22);
    expect(res).not.toBeNull();
    expect(res?.status).toBe('SUBCLINICAL_LOW');
    expect(res?.clinicalInsight).toContain('mitochondrial');
  });

  it('should recognize optimal Ferritin levels', () => {
    const res = evaluateBiomarkerFunctionally('Ferritin', 75);
    expect(res).not.toBeNull();
    expect(res?.status).toBe('OPTIMAL');
  });

  it('should flag subclinical hypothyroid risk when TSH is between 2.5 and 4.5 mIU/L', () => {
    const res = evaluateBiomarkerFunctionally('TSH', 3.4);
    expect(res).not.toBeNull();
    expect(res?.status).toBe('SUBCLINICAL_HIGH');
    expect(res?.clinicalInsight).toContain('subclinical hypothyroidism');
  });

  it('should flag subclinical Vitamin D deficiency below 50 ng/mL', () => {
    const res = evaluateBiomarkerFunctionally('Vitamin D (25-OH)', 32);
    expect(res).not.toBeNull();
    expect(res?.status).toBe('SUBCLINICAL_LOW');
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

describe('Clinical Pharmacology & Nutrient Depletion Engine', () => {
  it('should identify Vitamin B12 depletion and meal timing rules for Metformin', () => {
    const data = getDeterministicMedicineData('metformin');
    expect(data).not.toBeNull();
    expect(data?.name).toContain('Metformin');
    const b12Depletion = data?.nutrientDepletions.find(d => d.nutrient.includes('B12'));
    expect(b12Depletion).toBeDefined();
    expect(data?.optimalTiming.foodRequirement).toContain('food');
  });

  it('should identify Magnesium and B12 depletions and empty stomach rule for Omeprazole (PPI)', () => {
    const data = getDeterministicMedicineData('Prilosec');
    expect(data).not.toBeNull();
    expect(data?.class).toContain('Proton Pump Inhibitor');
    const magDepletion = data?.nutrientDepletions.find(d => d.nutrient.includes('Magnesium'));
    expect(magDepletion).toBeDefined();
    expect(data?.optimalTiming.bestTimeOfDay).toContain('Breakfast');
  });

  it('should identify CoQ10 depletion and evening dosing for Atorvastatin', () => {
    const data = getDeterministicMedicineData('Lipitor');
    expect(data).not.toBeNull();
    const coq10 = data?.nutrientDepletions.find(d => d.nutrient.includes('CoQ10'));
    expect(coq10).toBeDefined();
  });

  it('should flag dangerous interaction between St. John’s Wort and Sertraline (SSRI)', () => {
    const data = getDeterministicMedicineData('Zoloft');
    expect(data).not.toBeNull();
    const stJohns = data?.supplementInteractions.find(s => s.supplement.includes('St. John’s Wort'));
    expect(stJohns?.riskLevel).toBe('dangerous');
  });
});

describe('Deterministic Clinical Dietary Swaps', () => {
  it('should provide smart replacement for Oats to resolve resistant starch distension', () => {
    const swap = getClinicalDietarySwap('Oats');
    expect(swap).not.toBeNull();
    expect(swap?.smartReplacement).toContain('Cream of Rice');
    expect(swap?.expectedReliefTimeline).toBeDefined();
  });

  it('should recommend garlic-infused olive oil to bypass water-soluble fructans', () => {
    const swap = getClinicalDietarySwap('garlic');
    expect(swap).not.toBeNull();
    expect(swap?.category).toBe('FODMAP');
    expect(swap?.smartReplacement).toContain('Garlic-Infused');
  });

  it('should recommend pea/egg protein isolate to replace whey protein', () => {
    const swap = getClinicalDietarySwap('whey protein');
    expect(swap).not.toBeNull();
    expect(swap?.smartReplacement).toContain('Sprouted Pea');
  });
});
