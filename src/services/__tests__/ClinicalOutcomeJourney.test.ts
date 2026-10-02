import { describe, expect, it } from 'vitest';
import {
  buildClinicalReviewPrompt,
  buildReviewEvidence,
  isCurrentClinicalReview,
  normalizeClinicalReview,
  recordClinicalClarification,
} from '../clinicalReview';
import { buildClinicalOutcome, buildStructuredClinicalAnswer } from '../StructuredAnswerEngine';
import { clinicalSourceFingerprint } from '../clinicalReviewSourceState';
import { readClinicalIntakeHistory, updateClinicalIntakeField } from '../clinicalIntakeHistory';

describe('Clinical outcome and six-screen continuity', () => {
  it('updates or clears labelled onset away from the beginning without losing the narrative', () => {
    const story =
      'Primary symptoms: Fatigue. Onset: 1–2 weeks. I am unsure about triggers.\nProgression: Fluctuating.';
    const updated = updateClinicalIntakeField(story, 'Onset', '1–3 months');
    expect(readClinicalIntakeHistory(updated)).toEqual({
      symptoms: ['Fatigue'],
      onset: '1–3 months',
      progression: 'Fluctuating',
    });
    expect(updated).toContain('I am unsure about triggers.');
    const cleared = updateClinicalIntakeField(updated, 'Onset', null);
    expect(readClinicalIntakeHistory(cleared).onset).toBeNull();
    expect(cleared).not.toContain('1–2 weeks');
  });
  it('clearing guided labels in the story clears their selections; free text is not inferred into a diagnosis', () => {
    expect(readClinicalIntakeHistory('Tired after work, no fever.')).toEqual({
      symptoms: [],
      onset: null,
      progression: null,
    });
  });
  it('all three review objectives reach the prompt and keep the evidence boundary', () => {
    const explanations = buildClinicalReviewPrompt('Fatigue', null, [], 'differential');
    const visit = buildClinicalReviewPrompt('Fatigue', null, [], 'doctor_prep');
    const lab = buildClinicalReviewPrompt('Fatigue', null, [], 'lab_second_opinion');
    expect(explanations).toContain('Compare possible explanations');
    expect(visit).toContain('focused question for the clinician');
    expect(lab).toContain('printed units and reference intervals');
    expect(lab).toContain('Do not invent values');
  });
  it('an original source correction invalidates a snapshot but an unrelated case action does not', () => {
    const source = {
      intakeData: { chiefComplaint: 'Fatigue' },
      medicalRecords: [
        {
          id: 'r1',
          filename: 'Blood.pdf',
          findings: 'Hemoglobin 8.2 g/dL.',
          passages: [{ id: 'p1', text: 'Hemoglobin 8.2 g/dL.', page: 2 }],
        },
      ],
    };
    const report = {
      groundingVersion: 1,
      verdictVersion: 2,
      sourceFingerprint: clinicalSourceFingerprint(source),
    };
    expect(
      isCurrentClinicalReview(report, {
        ...source,
        events: [{ note: 'Visit prepared' }],
        updatedAt: 'later',
      })
    ).toBe(true);
    expect(isCurrentClinicalReview(report, { ...source, medicalRecords: [] })).toBe(false);
    expect(
      isCurrentClinicalReview(report, {
        ...source,
        events: [
          {
            id: 'new-history',
            label: 'User observation',
            note: 'Symptoms changed today.',
            date: '2026-10-02',
          },
        ],
      })
    ).toBe(false);
    expect(
      isCurrentClinicalReview(report, {
        ...source,
        medicalRecords: [
          {
            ...source.medicalRecords[0],
            passages: [{ id: 'p1', text: 'Hemoglobin 13.2 g/dL.', page: 2 }],
          },
        ],
      })
    ).toBe(false);
  });
  it('unresolved conflicting lab entries lead to reconciliation even without model questions', () => {
    const a = buildStructuredClinicalAnswer({
      documentedFacts: [
        { id: 'a', fact: 'Hemoglobin 8.2 g/dL.', source: 'A.pdf', recordId: 'ra', page: 2 },
      ],
      contradictions: [
        {
          topic: 'Hemoglobin entries',
          itemA: { finding: '8.2 g/dL', source: 'A.pdf' },
          itemB: { finding: '13.2 g/dL', source: 'B.pdf' },
          resolutionNeed: 'Which sampling time does each report describe?',
        },
      ],
    });
    expect(a.layer5_nextStep.chosenAction).toContain('Confirm the conflicting source');
    expect(a.layer5_nextStep.doctorVisitBrief.specificQuestion).toContain('sampling time');
    expect(a.layer2_whyThisMatters.sourcePassages[0]).toMatchObject({
      recordId: 'ra',
      findingId: 'a',
      pageNumber: 2,
    });
  });
  it('a saved clarification is explicitly pending reassessment and retains the actual review time', () => {
    const report = normalizeClinicalReview(
      {
        executiveSummary: 'Timing remains uncertain.',
        documentedFacts: [{ id: 'f', fact: 'Mild fatigue.', source: 'Patient intake' }],
      },
      null,
      undefined,
      {
        evidence: [
          { id: 'f', fact: 'Mild fatigue.', source: 'Patient intake', category: 'user_report' },
        ],
      }
    );
    const answer = buildClinicalOutcome({ ...report, interpretationUpdatePending: true });
    expect(answer.interpretationUpdatePending).toBe(true);
    expect(answer.generatedAt).toBe(report.structuredAnswer.generatedAt);
  });
  it('visible source conflicts survive a model omission without duplicating the intake', () => {
    const sourceCase = {
      id: 'case',
      intakeData: { chiefComplaint: 'Mild fatigue.' },
      medicalRecords: [
        { id: 'a', filename: 'A.pdf', reportDate: '2026-10-01', findings: 'Hemoglobin 8.2 g/dL.' },
        { id: 'b', filename: 'B.pdf', reportDate: '2026-10-01', findings: 'Hemoglobin 13.2 g/dL.' },
      ],
    };
    const evidence = buildReviewEvidence('Mild fatigue.', sourceCase);
    expect(evidence.filter((fact) => fact.fact === 'Mild fatigue.')).toHaveLength(1);
    const report = normalizeClinicalReview(
      {
        executiveSummary: 'The entries differ; their collection times are unknown.',
        documentedFacts: evidence,
      },
      null,
      undefined,
      { evidence }
    );
    expect(buildClinicalOutcome(report).layer3_otherExplanations.contradictionQueue).toHaveLength(
      1
    );
    expect(buildClinicalOutcome(report).layer5_nextStep.chosenAction).toContain(
      'Confirm the conflicting source'
    );
  });
  it('retains a supported summary while withholding an optional invented conversion', () => {
    const evidence = [
      {
        id: 'u',
        fact: 'Hemoglobin 82. Unit not supplied.',
        source: 'Unknown-unit.pdf',
        category: 'extracted_finding',
      },
    ];
    const report = normalizeClinicalReview(
      {
        executiveSummary:
          'A hemoglobin value is recorded without its unit. It cannot be interpreted or compared without that detail.',
        primaryHypothesis: 'Missing unit',
        documentedFacts: evidence,
        alternatives: [
          {
            type: 'insufficient_evidence',
            title: 'Unit conversion',
            mechanismSummary: 'The value converts to 8.2 g/dL.',
            supportingEvidence: [{ factId: 'u', description: 'Unknown units.' }],
          },
        ],
      },
      null,
      undefined,
      { evidence }
    );
    expect(report.quarantinedClaims).toHaveLength(1);
    expect(report.alternatives).toEqual([]);
    expect(report.executiveSummary).toContain('without its unit');
    expect(buildClinicalOutcome(report).interpretationsWithheld).toBe(true);
    expect(JSON.stringify(report.structuredAnswer)).not.toContain('8.2 g/dL');
    const awaitingReply = {
      ...report,
      reasoningPipeline: {
        ...report.reasoningPipeline,
        stage7_focusedQuestion: {
          ...report.reasoningPipeline.stage7_focusedQuestion,
          id: 'unit-question',
          question: 'What unit is printed on the original report?',
        },
      },
    };
    const clarified = recordClinicalClarification(awaitingReply, 'I cannot read the unit.');
    expect(clarified.executiveSummary).toBe(report.executiveSummary);
    expect(clarified.quarantinedClaims).toEqual(report.quarantinedClaims);
    expect(clarified.structuredAnswer.interpretationsWithheld).toBe(true);
    expect(clarified.structuredAnswer.interpretationUpdatePending).toBe(true);
    expect(clarified.structuredAnswer.generatedAt).toBe(report.structuredAnswer.generatedAt);
    expect(clarified.documentedFacts.at(-1)).toMatchObject({
      fact: 'I cannot read the unit.',
      category: 'user_report',
    });
    const urgent = recordClinicalClarification(
      awaitingReply,
      'I am having severe chest pain and difficulty breathing right now.'
    );
    expect(urgent.structuredAnswer.urgency.level).toBe('urgent_emergency_care');
  });
});
