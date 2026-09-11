import { describe, expect, it } from 'vitest';
import { buildCaseContext, caseMatchesSearch, caseActionLabel } from '../caseWorkspace';
import { buildClinicalReviewPrompt, normalizeClinicalReview } from '../clinicalReview';
import type { CaseItem } from '../CaseEngine';

const item = {
  id: 'case-1', title: 'Energy changes', intakeData: { chiefComplaint: 'Tired after lunch', timeline: 'Three weeks' },
  medicalRecords: [{ id: 'record-1', filename: 'Blood count.pdf', findings: 'Haemoglobin 13 g/dL', source: 'Uploaded report' }],
  currentSummary: { executiveSummary: 'Needs further context', topDiagnoses: [{ condition: 'Anaemia' }] }, events: [],
} as unknown as CaseItem;

describe('connected case context', () => {
  it('preserves source attribution and separates AI hypotheses from reported facts', () => {
    const context = JSON.parse(buildCaseContext(item));
    expect(context.reportedConcern).toBe('Tired after lunch');
    expect(context.records[0]).toMatchObject({ id: 'record-1', source: 'Uploaded report', findings: 'Haemoglobin 13 g/dL' });
    expect(context.priorAIInterpretation.notice).toContain('not a confirmed diagnosis');
    expect(context.priorAIInterpretation.possibilities).toEqual(['Anaemia']);
  });
  it('searches across records, conditions, and titles using all query words', () => {
    expect(caseMatchesSearch(item, 'ENERGY blood')).toBe(true);
    expect(caseMatchesSearch(item, 'anaemia')).toBe(true);
    expect(caseMatchesSearch(item, 'anaemia MRI')).toBe(false);
    expect(caseMatchesSearch(item, '  ')).toBe(true);
  });
  it('bounds very large context and handles incomplete draft records', () => {
    const context = JSON.parse(buildCaseContext({ ...item, intakeData: { chiefComplaint: 'a'.repeat(9000) }, medicalRecords: undefined } as unknown as CaseItem));
    expect(context.reportedConcern).toHaveLength(3000);
    expect(context.records).toEqual([]);
    expect(caseActionLabel({ title: 'Prepare a question' })).toBe('Prepare a question');
  });
});

describe('clinical review result boundary', () => {
  it('rejects empty and malformed results rather than saving a successful empty review', () => {
    for (const value of [null, [], {}, { executiveSummary: '' }]) expect(() => normalizeClinicalReview(value)).toThrow();
  });
  it('removes uncalibrated probabilities and tolerates malformed optional collections', () => {
    const result = normalizeClinicalReview({ executiveSummary: 'Records are incomplete.', matchConfidence: 84, topDiagnoses: [{ condition: 'An unverified possibility', confidence: 91 }], functionalBiomarkers: {}, uncertainties: ['Date unknown', null], immediateRelief: { dietSwaps: ['Double salt intake'] } });
    expect(result.matchConfidence).toBeNull();
    expect(result.topDiagnoses).toEqual([]);
    expect(result.functionalBiomarkers).toEqual([]);
    expect(result.uncertainties).toEqual(['Date unknown']);
    expect(result.immediateRelief.dietSwaps).toEqual([]);
  });
  it('includes the real case and medication context without seeded patient measurements', () => {
    const prompt = buildClinicalReviewPrompt('My actual concern', { medications: ['Example medication'] });
    expect(prompt).toContain('My actual concern');
    expect(prompt).toContain('Example medication');
    expect(prompt).not.toContain('18 ng/mL');
    expect(prompt).toContain('Never add irrelevant specialties to fill a template');
  });
});
