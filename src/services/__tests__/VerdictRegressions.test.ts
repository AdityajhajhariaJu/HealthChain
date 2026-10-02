// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
const { gateway } = vi.hoisted(() => ({ gateway: vi.fn() }));
vi.mock('../ai/transport', () => ({
  API_URL: '/api/gemini',
  fetchWithTimeout: gateway,
  sha256Hash: async () => 'test',
}));
import {
  buildReviewEvidence,
  normalizeClinicalReview,
  validateNarrativeGrounding,
  isCurrentClinicalReview,
} from '../clinicalReview';
import {
  alignChronology,
  detectCorrectionQueue,
  extractDateString,
} from '../ClinicalReasoningEngine';
import { evaluateClinicalUrgency } from '../clinicalTriageEngine';
import { runJarvisInvestigation } from '../ai/investigation';

const review = (
  text: string,
  extra = {},
  evidence = buildReviewEvidence('Mild bloating. Coeliac disease has not been diagnosed.')
) =>
  normalizeClinicalReview(
    {
      executiveSummary: text,
      primaryHypothesis: 'Source review',
      documentedFacts: evidence,
      ...extra,
    },
    null,
    undefined,
    { evidence }
  );
const fact = (id: string, text: string, date?: string) => ({
  id,
  fact: text,
  source: 'synthetic-lab.txt',
  category: 'extracted_finding',
  allowedRole: 'Extracted passage',
  reportDate: date,
});

describe('Clinical verdict regressions from real-example audit', () => {
  it('requires the current verdict contract before reopening a saved interpretation', () => {
    expect(isCurrentClinicalReview({ groundingVersion: 1 })).toBe(false);
    expect(isCurrentClinicalReview(review('Review the reported concern.'))).toBe(true);
  });
  it('does not convert a negated diagnosis into a confirmed diagnosis', () => {
    const result = review('You have confirmed coeliac disease.');
    expect(result.quarantinedClaims.length).toBeGreaterThan(0);
    expect(result.executiveSummary).toContain('withheld');
  });
  it('allows an insufficient-evidence explanation to summarize supplied values without pretending they support a cause', () => {
    const evidence = [
      fact('a', 'Hemoglobin 13.2 g/dL. Sample collected 2026-03-01.'),
      fact('b', 'Hemoglobin 8.2 g/dL. Sample collected 2026-10-01.'),
    ];
    const result = review(
      'The cause of this change is unknown.',
      {
        alternatives: [
          {
            type: 'insufficient_evidence',
            title: 'Insufficient evidence to determine cause',
            mechanismSummary:
              'Hemoglobin changed from 13.2 g/dL to 8.2 g/dL; the cause cannot be determined.',
            supportingEvidence: [],
            conflictingEvidence: [],
          },
        ],
      },
      evidence
    );
    expect(result.quarantinedClaims).toEqual([]);
    expect(result.alternatives).toHaveLength(1);
  });
  it('accepts a qualified statement that no definitive cause can be determined', () => {
    expect(
      review('No definitive cause can be determined from these observations.').quarantinedClaims
    ).toEqual([]);
    expect(
      validateNarrativeGrounding(
        'Milk might contribute to bloating if you have lactose intolerance.',
        buildReviewEvidence('Bloating after milk.')
      ).isSupported
    ).toBe(true);
    expect(
      validateNarrativeGrounding(
        'Milk could relate to bloating if it contains lactose and you have lactose intolerance.',
        buildReviewEvidence('Bloating after milk.')
      ).isSupported
    ).toBe(true);
    expect(
      review('No definitive cause can be determined, but you have confirmed coeliac disease.')
        .quarantinedClaims.length
    ).toBeGreaterThan(0);
  });
  it.each([
    'Your hemoglobin is 6 g/dL.',
    'Your symptoms are definitely caused by milk.',
    'You have IBS.',
  ])('withholds unsupported claim: %s', (claim) => {
    expect(review(claim).quarantinedClaims.length).toBeGreaterThan(0);
  });
  it('withholds rejected conclusions in every derived interpretation while retaining the source facts', () => {
    const result = review('You have confirmed mitochondrial syndrome.', {
      perspectives: [
        {
          specialty: 'Gastroenterology',
          questionAddressed: 'What causes this?',
          interpretation: 'Confirmed mitochondrial syndrome causes the bloating.',
          evidenceConsidered: ['current_intake'],
        },
      ],
      alternatives: [
        {
          type: 'connected_explanation',
          title: 'Mitochondrial syndrome',
          mechanismSummary: 'Confirmed mitochondrial syndrome causes bloating.',
          supportingEvidence: [{ factId: 'current_intake', description: 'Bloating' }],
        },
      ],
    });
    expect(result.documentedFacts).toHaveLength(1);
    expect(result.structuredAnswer.layer2_whyThisMatters.sourcePassages).toHaveLength(1);
    expect(result.meaningfulPerspectives).toEqual([]);
    expect(result.alternatives).toEqual([]);
    expect(result.reasoningPipeline.stage4_perspectives).toEqual([]);
    expect(result.clinicalSynthesis.mainFinding).not.toContain('mitochondrial');
    expect(result.structuredAnswer.layer3_otherExplanations.plausibleAlternatives).toEqual([]);
  });
  it('binds a lab value and printed range to its own analyte and takes dates from the source', () => {
    const evidence = [
      fact(
        'lab',
        'Hemoglobin 8.2 g/dL (reference 12–15); ferritin 5 ng/mL (reference 15–150). Sample collected 2026-10-01.',
        '2026-10-02'
      ),
    ];
    const result = review(
      'Review these supplied values.',
      {
        functionalBiomarkers: [
          { factId: 'lab', biomarker: 'Hemoglobin', value: '5 ng/mL', reportDate: '2030-01-01' },
          {
            factId: 'lab',
            biomarker: 'Hemoglobin',
            value: '8.2 g/dL',
            standardRange: '15–150',
            reportDate: '2030-01-01',
          },
        ],
      },
      evidence
    );
    expect(result.functionalBiomarkers).toHaveLength(1);
    expect(result.functionalBiomarkers[0]).toMatchObject({
      unit: 'g/dL',
      standardRange: 'Not provided',
      reportDate: '2026-10-01',
    });
    expect(validateNarrativeGrounding('Hemoglobin is 5 ng/mL.', evidence).isSupported).toBe(false);
  });
  it('keeps original evidence visible after a model changes a fact with the same ID', () => {
    const evidence = buildReviewEvidence('Mild fatigue.');
    const result = review(
      'Review sources.',
      { documentedFacts: [{ ...evidence[0], fact: 'Severe chest pain.' }] },
      evidence
    );
    expect(result.quarantinedFacts).toHaveLength(1);
    expect(result.structuredAnswer.layer2_whyThisMatters.sourcePassages[0].passage).toBe(
      'Mild fatigue.'
    );
  });
  it('detects same-date conflicts in free text without calling different-date changes a conflict', () => {
    const a = fact('a', 'Hemoglobin 8.2 g/dL. Sample collected 2026-10-01.');
    const b = fact('b', 'Hemoglobin 13.2 g/dL. Sample collected 2026-10-01.');
    expect(detectCorrectionQueue([a, b])[0].type).toBe('conflicting_values');
    expect(validateNarrativeGrounding('The difference is 5.0 g/dL.', [a, b]).isSupported).toBe(
      true
    );
    expect(validateNarrativeGrounding('A difference of 5.0 g/dL.', [a, b]).isSupported).toBe(true);
    expect(validateNarrativeGrounding('A difference of 7.0 g/dL.', [a, b]).isSupported).toBe(false);
    expect(
      detectCorrectionQueue([
        a,
        { ...b, fact: 'Hemoglobin 13.2 g/dL. Sample collected 2026-03-01.' },
      ])
    ).toEqual([]);
  });
  it('preserves ambiguous dates and reports only gaps between supplied dated records', () => {
    expect(extractDateString('03/04/2026')).toBeNull();
    const ambiguous = alignChronology([fact('a', 'Test date', '03/04/2026')]);
    expect(ambiguous.entries[0]).toMatchObject({
      rawReportDate: '03/04/2026',
      temporalConfidence: 'ambiguous',
    });
    expect(ambiguous.gapAssessment).toBe('insufficient_dates');
    const dated = alignChronology([
      fact('a', 'Old test', '2026-03-01'),
      fact('b', 'New test', '2026-10-01'),
    ]);
    expect(dated.gaps).toHaveLength(1);
    expect(dated.gaps[0].clinicalSignificance).toContain('not evidence');
  });
  it.each([
    'I have chest pressure and breathlessness right now, starting 20 minutes ago. My ECG six months ago was normal.',
    'I have severe constant stomach pain right now.',
  ])('routes active urgent symptoms before provider calls: %s', async (history) => {
    gateway.mockClear();
    const result = await runJarvisInvestigation(history, [], null);
    expect(gateway).not.toHaveBeenCalled();
    expect(result.clinicalSynthesis.urgencyLevel).toBe('urgent_emergency_care');
    expect(result.structuredAnswer.layer5_nextStep.chosenAction).toMatch(/emergency services now/);
  });
  it.each([
    'No severe chest pain. No shortness of breath.',
    'I had severe chest pain six months ago. It resolved and I am well now.',
    'I have chest pressure and no breathlessness or sweating.',
    'What is severe constant stomach pain?',
    'I am not suicidal and do not want to die.',
  ])(
    'does not treat a denial, resolved history, or educational question as an emergency: %s',
    (input) => {
      expect(evaluateClinicalUrgency(input).level).toBe('not_assessed');
    }
  );
  it('prioritizes clinician assessment for bleeding and unintended weight loss', () => {
    const result = review(
      'This needs assessment.',
      {},
      buildReviewEvidence('Bloating, blood mixed into my stool and I lost 5 kg without trying.')
    );
    expect(result.structuredAnswer.urgency?.level).toBe('prompt_clinical_review');
    expect(result.structuredAnswer.layer5_nextStep.chosenAction).toMatch(/clinician promptly/);
  });
  it('prioritizes assessment for breathlessness with a recent value below its own printed range', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-02T12:00:00Z'));
    try {
      const evidence = [
        fact('lab', 'Hemoglobin 8.2 g/dL (reference 12.0–15.5 g/dL). Sample collected 2026-10-01.'),
      ];
      expect(
        evaluateClinicalUrgency('I get short of breath walking upstairs.', evidence).level
      ).toBe('prompt_clinical_review');
      expect(evaluateClinicalUrgency('I do not get short of breath.', evidence).level).toBe(
        'not_assessed'
      );
      expect(
        evaluateClinicalUrgency('I get short of breath walking upstairs.', [
          fact(
            'old',
            'Hemoglobin 8.2 g/dL (reference 12.0–15.5 g/dL). Sample collected 2026-01-01.'
          ),
        ]).level
      ).toBe('not_assessed');
    } finally {
      vi.useRealTimers();
    }
  });
});
