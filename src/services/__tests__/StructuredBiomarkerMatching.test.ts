import { describe, it, expect } from 'vitest';
import { matchesBiomarkerValue } from '../clinicalReview';

describe('P1 Finding 4: Structured Biomarker Matching (Operator & Unit Rigor)', () => {
  it('rejects candidate when unit differs from source', () => {
    const source = 'Glucose 12 mg/dL';
    const candidateDifferentUnit = '12 mmol/L';

    // Must return false: 12 mg/dL is not 12 mmol/L
    expect(matchesBiomarkerValue(source, candidateDifferentUnit)).toBe(false);
  });

  it('rejects candidate when comparison operator differs from source', () => {
    const source = 'Glucose 12 mg/dL';
    const candidateWithLessOperator = '<12';

    // Must return false: <12 is not 12
    expect(matchesBiomarkerValue(source, candidateWithLessOperator)).toBe(false);
  });

  it('rejects candidate when source has comparison operator but candidate specifies exact value', () => {
    const source = 'TSH <0.05 uIU/mL';
    const candidateExact = '0.05';

    // Must return false: exact 0.05 is not <0.05
    expect(matchesBiomarkerValue(source, candidateExact)).toBe(false);
  });

  it('accepts candidate when both operator, numeric value, and unit match', () => {
    const source = 'Glucose 12 mg/dL';
    const candidateMatching = '12 mg/dL';

    expect(matchesBiomarkerValue(source, candidateMatching)).toBe(true);
  });

  it('accepts candidate with operator when source has the identical operator', () => {
    const source = 'TSH <0.05 uIU/mL';
    const candidateWithOp = '<0.05';

    expect(matchesBiomarkerValue(source, candidateWithOp)).toBe(true);
  });

  it('enforces numeric digit boundaries so 12 does not match 112, 120, or 1.12', () => {
    const source = 'Platelets 112 K/mcL';
    expect(matchesBiomarkerValue(source, '12')).toBe(false);
  });
});
