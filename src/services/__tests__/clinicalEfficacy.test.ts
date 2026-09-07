import { describe, it, expect } from 'vitest';
import { evaluateEmergencyTriage } from '../clinicalTriageEngine';
import { evaluateBiomarkerFunctionally } from '../functionalBiomarkers';
import { generateDoctorSummary } from '../TriggerEngine';

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
