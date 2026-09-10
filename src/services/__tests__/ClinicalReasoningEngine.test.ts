import { describe, it, expect } from 'vitest';
import { 
  alignChronology, 
  detectCorrectionQueue, 
  justifyPerspectives, 
  buildTriProngChallenges, 
  selectFocusedClarification, 
  synthesizeFindings, 
  computeSelectiveUpdateDiff, 
  runClinicalReasoningPipeline,
  SourceLinkedEvidence,
  AlternativeInterpretation
} from '../ClinicalReasoningEngine';

describe('ClinicalReasoningEngine — 10 Stages & Cyclic Loop', () => {
  const mockFacts: SourceLinkedEvidence[] = [
    {
      id: 'f1',
      fact: 'Experienced sudden lightheadedness and tachycardia (128 bpm) on standing on 2024-03-15',
      source: 'Patient diary',
      category: 'user_report',
      allowedRole: 'Evidence of the reported experience',
      confidence: 'self_reported',
      timestamp: '2024-03-15T10:00:00Z',
    },
    {
      id: 'f2',
      fact: 'Serum Ferritin 12 ng/ml (reference 30-200 ng/ml) drawn on 2024-03-15',
      source: 'Metabolic_Panel.pdf',
      page: 1,
      category: 'extracted_finding',
      allowedRole: 'Provisional record content until checked',
      confidence: 'provisional',
      timestamp: '2024-03-16T14:00:00Z',
    },
    {
      id: 'f3',
      fact: 'Clinician assessment on 2024-01-10: Patient denies palpitations or syncope; cardiac exam normal.',
      source: 'Clinic_Visit_Note.pdf',
      page: 2,
      category: 'documented_clinician_assessment',
      allowedRole: 'A dated clinician assessment—not automatically permanent truth',
      confidence: 'verified',
      timestamp: '2024-01-10T11:00:00Z',
    },
    {
      id: 'f4',
      fact: 'Serum Ferritin 28 pmol/l from second lab on 2024-04-01',
      source: 'Followup_Labs.pdf',
      page: 1,
      category: 'extracted_finding',
      allowedRole: 'Provisional record content until checked',
      confidence: 'provisional',
      timestamp: '2024-04-01T09:00:00Z',
    },
    {
      id: 'f5',
      fact: 'Experienced sudden lightheadedness and tachycardia (128 bpm) on standing on 2024-03-15',
      source: 'Intake duplicate',
      category: 'user_report',
      allowedRole: 'Evidence of the reported experience',
      confidence: 'self_reported',
      timestamp: '2024-03-17T08:00:00Z',
    }
  ];

  it('Stage 1 & 2: aligns chronology, separates event vs report vs entry dates, and identifies gaps/overlaps', () => {
    const timeline = alignChronology(mockFacts);
    expect(timeline.entries.length).toBe(5);

    // Event date populated for user report
    const userReportEntry = timeline.entries.find(e => e.relatedFactIds.includes('f1'));
    expect(userReportEntry?.eventDate).toBe('2024-03-15');

    // Report date populated for clinic assessment and lab
    const clinicEntry = timeline.entries.find(e => e.relatedFactIds.includes('f3'));
    expect(clinicEntry?.reportDate).toBe('2024-01-10');

    // Overlaps detected for 2024-03-15 (both patient report and lab on same date)
    const overlap20240315 = timeline.overlaps.find(o => o.timeframe === '2024-03-15');
    expect(overlap20240315).toBeDefined();
    expect(overlap20240315?.phenomena.length).toBeGreaterThanOrEqual(2);
  });

  it('Stage 3: generates a correction queue for duplicates, unit changes, and differing accounts', () => {
    const queue = detectCorrectionQueue(mockFacts);

    // Duplicate detection
    const dup = queue.find(q => q.type === 'duplicate');
    expect(dup).toBeDefined();
    expect(dup?.title).toContain('Duplicate');

    // Unit change detection (Ferritin ng/ml vs pmol/l)
    const unitChange = queue.find(q => q.type === 'unit_change');
    expect(unitChange).toBeDefined();
    expect(unitChange?.discrepancyDescription).toContain('ng/ml vs pmol/l');

    // Differing accounts detection (patient reported palpitations vs doctor note denying palpitations)
    const differing = queue.find(q => q.type === 'differing_accounts');
    expect(differing).toBeDefined();
    expect(differing?.title).toContain('PALPITATIONS');
  });

  it('Stage 4: selects clinical perspectives strictly justified by explicit unanswered questions', () => {
    const questions = [
      'Does orthostatic standing reproduce cerebral perfusion latency?',
      'Is intracellular mitochondrial iron depleted despite borderline ferritin?'
    ];

    const perspectives = justifyPerspectives(questions);
    expect(perspectives.length).toBeGreaterThanOrEqual(2);
    expect(perspectives[0].unansweredQuestionAddressed).toBe(questions[0]);
    expect(perspectives[0].justification).toContain(questions[0]);
    expect(perspectives[1].unansweredQuestionAddressed).toBe(questions[1]);
  });

  it('Stage 5 & 6: generates competing alternatives and tri-prong challenges (supporting, conflicting, missing)', () => {
    const alternatives: AlternativeInterpretation[] = [
      {
        id: 'alt_pots',
        type: 'connected_explanation',
        title: 'Postural Orthostatic Tachycardia with Functional Iron Depletion',
        mechanismSummary: 'Autonomic baroreceptor compensation to depleted oxygen-carrying reserves',
        likelihoodAssessment: 'leading',
        rationale: 'Accounts for co-occurrence of standing heart rate spikes and low ferritin',
      },
      {
        id: 'alt_separate',
        type: 'separate_explanations',
        title: 'Independent Nutritional Deficiency and Deconditioning',
        mechanismSummary: 'Unrelated dietary deficiency occurring alongside benign positional changes',
        likelihoodAssessment: 'competing',
        rationale: 'Avoids premature syndrome diagnosis',
      }
    ];

    const challenges = buildTriProngChallenges(alternatives, mockFacts, ['Serum Transferrin Saturation', 'Active Standing 10-Minute Test']);
    expect(challenges.length).toBe(2);

    challenges.forEach(challenge => {
      // Prong 1: Supporting
      expect(challenge.supportingEvidence.length).toBeGreaterThan(0);
      // Prong 2: Conflicting / Normal
      expect(challenge.conflictingEvidence.length).toBeGreaterThan(0);
      // Prong 3: Missing / What would change it
      expect(challenge.missingEvidenceWhatWouldChangeIt.length).toBeGreaterThan(0);
      expect(challenge.missingEvidenceWhatWouldChangeIt[0].potentialImpact).toContain('elevate or demote');
    });
  });

  it('Stage 7 & 8: chooses one focused clarification question and synthesizes balanced findings', () => {
    const alternatives: AlternativeInterpretation[] = [
      { id: 'alt_1', type: 'connected_explanation', title: 'Post-Viral Autonomic Cascade', mechanismSummary: 'MDT', likelihoodAssessment: 'leading', rationale: 'Labs' }
    ];
    const focused = selectFocusedClarification(
      ['Did heart rate spikes begin immediately following a viral infection?'],
      ['Active Standing Test'],
      alternatives
    );

    expect(focused.question).toBe('Did heart rate spikes begin immediately following a viral infection?');
    expect(focused.whyThisQuestion).toBeTruthy();
    expect(focused.decisionImpact).toContain('Post-Viral Autonomic Cascade');

    const synthesis = synthesizeFindings(mockFacts, alternatives, [], ['Test sensitivity unconfirmed']);
    expect(synthesis.mainFinding).toContain('Post-Viral Autonomic Cascade');
    expect(synthesis.empiricalBasis.length).toBeGreaterThan(0);
    expect(synthesis.limitations.length).toBeGreaterThan(0);
    expect(synthesis.practicalImplication).toContain('appointment');
  });

  it('Stage 9, 10 & Cyclic Feedback Loop: loops answer into verified facts and recomputes selective update diff', () => {
    // 1. Initial pipeline run
    const initial = runClinicalReasoningPipeline({
      documentedFacts: mockFacts,
      primaryHypothesis: 'Orthostatic baroreceptor instability',
      uncertainties: ['Exact trigger date unknown'],
      missingLinks: ['Active standing test'],
      questionsForClinician: ['Does active standing confirm POTS?'],
    });

    expect(initial.stage1_facts.length).toBe(5);
    expect(initial.stage10_selectiveUpdate).toBeDefined();
    expect(initial.stage10_selectiveUpdate?.triggerEvent).toContain('baseline');

    // 2. User answers the Stage 7 clarification question (The Feedback Loop)
    const updated = runClinicalReasoningPipeline(
      {
        documentedFacts: initial.stage1_facts,
        primaryHypothesis: initial.stage5_alternatives[0].title,
        uncertainties: initial.stage9_continuity.openQuestions,
        missingLinks: ['Active standing test'],
        questionsForClinician: initial.stage9_continuity.openQuestions,
      },
      initial,
      {
        questionId: initial.stage7_focusedQuestion.id,
        answerText: 'Symptoms began 10 days after COVID infection in Jan 2024, heart rate reaches 130 bpm within 3 minutes of standing.'
      }
    );

    // Answer is appended to Stage 1 Verified Facts
    expect(updated.stage1_facts.length).toBe(6);
    const feedbackFact = updated.stage1_facts.find(f => f.id.startsWith('feedback_fact_'));
    expect(feedbackFact).toBeDefined();
    expect(feedbackFact?.fact).toContain('COVID infection');

    // Stage 10 Selective Update documents "What changed and why"
    expect(updated.stage10_selectiveUpdate).toBeDefined();
    expect(updated.stage10_selectiveUpdate?.triggerEvent).toContain('COVID infection');
    expect(updated.stage10_selectiveUpdate?.resolvedQuestions.length).toBeGreaterThan(0);
  });
});
