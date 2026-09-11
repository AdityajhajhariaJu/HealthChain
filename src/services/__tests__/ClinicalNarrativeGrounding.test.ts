// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { normalizeClinicalReview, buildReviewEvidence } from '../clinicalReview';

describe('P1 Finding 1: Clinical Narrative & Conclusion Grounding Validation', () => {
  it('quarantines ungrounded diagnostic conclusions in executive summary, primary hypothesis, and SBAR assessment', () => {
    // 1. Evidence contains only mild knee symptom
    const evidence = buildReviewEvidence('Knee discomfort');
    expect(evidence).toHaveLength(1);
    expect(evidence[0].fact).toBe('Knee discomfort');

    // 2. Model outputs an ungrounded, fabricated definitive conclusion
    const ungroundedReport = {
      primaryHypothesis: 'Confirmed rare disease',
      executiveSummary: 'Confirmed rare disease from this knee symptom',
      documentedFacts: [
        {
          id: evidence[0].id,
          fact: 'Knee discomfort',
          source: 'Patient note',
          category: 'user_report',
        },
      ],
      perspectives: [],
      functionalBiomarkers: [],
      topDiagnoses: [],
      alternatives: [],
      doctorActionPlan: {
        sbar: {
          situation: 'Patient reports knee discomfort.',
          background: 'Note from patient.',
          assessment: 'Confirmed rare disease',
          recommendation: 'Immediate specialist referral.',
        },
      },
    };

    const review = normalizeClinicalReview(ungroundedReport, null, undefined, { evidence });

    // The ungrounded claims MUST be quarantined
    expect(review.quarantinedClaims.length).toBeGreaterThan(0);
    expect(
      review.quarantinedClaims.some(
        (c) =>
          c.text.includes('rare disease') ||
          (c.unsupportedReason || '').toLowerCase().includes('ungrounded') ||
          (c.unsupportedReason || '').toLowerCase().includes('unsupported')
      )
    ).toBe(true);

    // Narrative outputs MUST NOT retain the ungrounded diagnostic conclusion
    expect(review.executiveSummary).not.toContain('Confirmed rare disease');
    expect(review.primaryHypothesis).not.toContain('Confirmed rare disease');
    expect(review.doctorActionPlan.sbar.assessment).not.toContain('Confirmed rare disease');

    // Safe fallbacks must be presented instead
    expect(review.primaryHypothesis).toMatch(/review|evaluation|observation/i);
    expect(review.executiveSummary).toContain('withheld');
  });

  it('allows benign observational summaries and grounded hypothesis framing without false-positive quarantine', () => {
    const evidence = buildReviewEvidence('Patient notes intermittent knee pain after jogging.');
    const groundedReport = {
      primaryHypothesis: 'Mechanical knee strain under evaluation',
      executiveSummary: 'Intermittent knee pain reported after jogging. Requires assessment of joint mechanics and load.',
      documentedFacts: [
        {
          id: evidence[0].id,
          fact: 'Patient notes intermittent knee pain after jogging.',
          source: 'Patient note',
          category: 'user_report',
        },
      ],
      perspectives: [],
      functionalBiomarkers: [],
      topDiagnoses: [],
      alternatives: [],
      doctorActionPlan: {
        sbar: {
          situation: 'Knee pain after jogging.',
          background: 'Patient reported.',
          assessment: 'Mechanical knee strain under evaluation',
          recommendation: 'Rest and gradual loading.',
        },
      },
    };

    const review = normalizeClinicalReview(groundedReport, null, undefined, { evidence });

    expect(review.quarantinedClaims).toHaveLength(0);
    expect(review.executiveSummary).toContain('Intermittent knee pain');
    expect(review.primaryHypothesis).toBe('Mechanical knee strain under evaluation');
    expect(review.doctorActionPlan.sbar.assessment).toBe('Mechanical knee strain under evaluation');
  });
});
