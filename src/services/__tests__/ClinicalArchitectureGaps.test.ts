// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { getUnifiedCaseScope, getCaseDocumentedAnswers } from '../caseWorkspace';
import { normalizeClinicalReview } from '../clinicalReview';
import { createCaseDraft, getCase, transitionCaseQuestionLifecycle, addCaseQuestion, updateCaseDifferentials } from '../CaseEngine';
import { evaluateTrialCriteria } from '../../features/tools/ClinicalTrialsMatcher';
import { runClinicalReasoningPipeline } from '../ClinicalReasoningEngine';
import { getConnectionDetectiveReport } from '../ConnectionDetectiveEngine';

describe('Clinical Architecture Gaps & Constitutional Verification Suite (Steps 9 & 10)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('Order 1: Unified Case Scope Resolution (Point 10 Gaps 5 & 8)', () => {
    it('should resolve explicit case ID when provided', () => {
      const caseA = createCaseDraft({
        title: 'Cardiac Palpitations Case',
        mode: 'jarvis',
        intakeData: { chiefComplaint: 'Sudden tachycardia with exertion' }
      });
      const caseB = createCaseDraft({
        title: 'Gastric Reflux Case',
        mode: 'multi',
        intakeData: { chiefComplaint: 'Epigastric burn at night' }
      });

      const scope = getUnifiedCaseScope(caseA.id);
      expect(scope.caseItem).not.toBeNull();
      expect(scope.caseItem?.id).toBe(caseA.id);
      expect(scope.caseItem?.title).toBe('Cardiac Palpitations Case');
    });

    it('should fallback to active case or first available case if preferred ID is null', () => {
      const caseC = createCaseDraft({
        title: 'Metabolic Evaluation',
        mode: 'jarvis',
        intakeData: { chiefComplaint: 'Elevated fasting glucose' }
      });

      const scope = getUnifiedCaseScope(null);
      expect(scope.caseItem).not.toBeNull();
      expect(scope.caseItem?.id).toBe(caseC.id);
    });

    it('should extract documented answers from case records and intake', () => {
      const testCase = createCaseDraft({
        title: 'Respiratory Assessment',
        intakeData: {
          chiefComplaint: 'Shortness of breath on mild stairs',
          timeline: 'Persistent for 6 weeks',
          currentMedications: 'Albuterol inhaler 2 puffs PRN',
          allergies: 'Penicillin (urticaria)'
        }
      });

      const answers = getCaseDocumentedAnswers(testCase);
      expect(answers.length).toBeGreaterThanOrEqual(3);
      expect(answers.some(a => a.category === 'symptom' && a.value.includes('Shortness of breath'))).toBe(true);
      expect(answers.some(a => a.category === 'timeline' && a.value.includes('6 weeks'))).toBe(true);
      expect(answers.some(a => a.category === 'medication' && a.value.includes('Albuterol'))).toBe(true);
      expect(answers.some(a => a.category === 'allergy' && a.value.includes('Penicillin'))).toBe(true);
    });
  });

  describe('Order 2: Evidence Source Verification (Point 10 Gap 3)', () => {
    it('should flag unverified sources not present in uploaded case records', () => {
      const testCase = createCaseDraft({
        title: 'Neurology Review',
        intakeData: { chiefComplaint: 'Migraines with aura' }
      });

      const rawReview = {
        primaryHypothesis: 'Vestibular Migraine',
        executiveSummary: 'Consistent episodic vertigo and aura without focal neurological deficit.',
        documentedFacts: [
          {
            fact: 'Head MRI normal without white matter hyperintensities',
            source: 'External Brain MRI 2021',
            relevance: 'High',
            category: 'imaging'
          }
        ]
      };

      const normalized = normalizeClinicalReview(rawReview, null, undefined, testCase);
      const evidenceItem = normalized.documentedFacts[0];

      expect(evidenceItem.isUnverifiedSource).toBe(true);
      expect(evidenceItem.sourceVerificationStatus).toBe('unverified_reference');
    });

    it('should verify sources that match uploaded medical record filenames or types', () => {
      const testCase = createCaseDraft({
        title: 'Endocrine Review',
        intakeData: { chiefComplaint: 'Fatigue' }
      });
      testCase.medicalRecords = [
        {
          id: 'rec_tsh_01',
          filename: 'Lab_Report_TSH_Panel.pdf',
          findings: 'TSH 4.8 mIU/L (elevated), Free T4 1.1 ng/dL (normal)',
          source: 'Quest Diagnostics',
          type: 'lab_report',
          addedAt: new Date().toISOString()
        }
      ];

      const rawReview = {
        primaryHypothesis: 'Subclinical Hypothyroidism',
        executiveSummary: 'Borderline elevated TSH with normal Free T4.',
        documentedFacts: [
          {
            fact: 'TSH elevated at 4.8 mIU/L',
            source: 'Lab_Report_TSH_Panel.pdf',
            relevance: 'High',
            category: 'laboratory'
          }
        ]
      };

      const normalized = normalizeClinicalReview(rawReview, null, undefined, testCase);
      const evidenceItem = normalized.documentedFacts[0];

      expect(evidenceItem.isUnverifiedSource).toBe(false);
      expect(evidenceItem.sourceVerificationStatus).toBe('verified_case_record');
    });
  });

  describe('Order 3: Contradiction Queue Extraction & Structured Answer (Point 9 Item 4 & Point 10 Gap 2)', () => {
    it('should extract explicit contradictions from review JSON and normalize them', () => {
      const rawReview = {
        primaryHypothesis: 'Inflammatory Bowel Disease vs IBS',
        executiveSummary: 'Mixed clinical presentation.',
        contradictions: [
          {
            id: 'contra_01',
            topic: 'Biopsy vs Fecal Calprotectin discrepancy',
            itemA: { date: '2025-01-10', source: 'Colonoscopy Biopsy', finding: 'Patchy active colitis in terminal ileum' },
            itemB: { date: '2025-02-15', source: 'Repeat Fecal Calprotectin', finding: 'Calprotectin 38 ug/g (within normal limits)' },
            clinicalSignificance: 'Discordance between histologic mucosal inflammation and normal fecal biomarker.',
            resolutionNeed: 'Should mucosal healing be reassessed or was earlier biopsy focal?'
          }
        ]
      };

      const normalized = normalizeClinicalReview(rawReview);
      expect(normalized.contradictions).toHaveLength(1);
      expect(normalized.contradictions[0].itemA.source).toBe('Colonoscopy Biopsy');
      expect(normalized.contradictions[0].itemB.source).toBe('Repeat Fecal Calprotectin');
      expect(normalized.contradictions[0].clinicalSignificance).toContain('Discordance');

      // Verify Layer 3 structured answer integration
      const structured = normalized.structuredAnswer;
      expect(structured.layer3_otherExplanations.contradictionQueue).toBeDefined();
      expect(structured.layer3_otherExplanations.contradictionQueue).toHaveLength(1);
      expect(structured.layer3_otherExplanations.contradictionQueue[0].itemA.source).toBe('Colonoscopy Biopsy');
    });

    it('should derive contradictions from stage3_correctionQueue if contradictions array is absent', () => {
      const rawReview = {
        primaryHypothesis: 'Autonomic Dysregulation',
        executiveSummary: 'POTS presentation.',
        reasoningPipeline: {
          stage3_correctionQueue: [
            {
              id: 'err_01',
              step: 'Correction 1',
              type: 'unresolved_discrepancy',
              sourceDoc: '24hr Holter Monitoring',
              originalFinding: 'Resting sinus tachycardia',
              reconciledFinding: 'Holter shows postural surge only; resting heart rate is 64 bpm.',
              reason: 'Excludes inappropriate sinus tachycardia; supports POTS posture dependence.'
            }
          ]
        }
      };

      const normalized = normalizeClinicalReview(rawReview);
      expect(normalized.contradictions.length).toBeGreaterThanOrEqual(1);
      expect(normalized.contradictions[0].itemA.finding).toContain('Resting sinus tachycardia');
      expect(normalized.contradictions[0].itemB.finding).toContain('Holter shows postural surge only');
    });
  });

  describe('Order 7: 4-Stage Clinical Question Lifecycle (Point 9 Item 6)', () => {
    it('should transition question lifecycle through open, prepared, discussed, resolved', () => {
      const testCase = createCaseDraft({
        title: 'Pre-op Clearance Case',
        intakeData: { chiefComplaint: 'Knee arthroscopy' }
      });

      const q = addCaseQuestion(testCase.id, {
        questionText: 'Should antiplatelet therapy be held 5 days prior to arthroscopy?',
        raisedBySpecialty: 'Cardiology',
        supportingEvidenceIds: []
      });

      expect(q).not.toBeNull();
      expect(q?.status).toBe('open');

      // Transition to prepared
      const prepSuccess = transitionCaseQuestionLifecycle(testCase.id, q!.id, 'prepared', 'Added to appointment brief agenda');
      expect(prepSuccess).toBe(true);
      let updatedCase = getCase(testCase.id);
      let targetQ = updatedCase?.questions?.find(item => item.id === q!.id);
      expect(targetQ?.status).toBe('prepared');
      expect(targetQ?.outcomeNote).toBe('Added to appointment brief agenda');

      // Transition to discussed
      const discSuccess = transitionCaseQuestionLifecycle(testCase.id, q!.id, 'discussed', 'Clinician advised holding 7 days instead of 5');
      expect(discSuccess).toBe(true);
      updatedCase = getCase(testCase.id);
      targetQ = updatedCase?.questions?.find(item => item.id === q!.id);
      expect(targetQ?.status).toBe('discussed');

      // Transition to resolved
      const resSuccess = transitionCaseQuestionLifecycle(testCase.id, q!.id, 'resolved', 'Medication hold protocol confirmed with surgery center');
      expect(resSuccess).toBe(true);
      updatedCase = getCase(testCase.id);
      targetQ = updatedCase?.questions?.find(item => item.id === q!.id);
      expect(targetQ?.status).toBe('resolved');
      expect(targetQ?.resolvedAt).toBeDefined();
    });
  });

  describe('Order 8: Real Criteria Screening Evaluation (Point 9 Item 9 & Point 10 Gap 7)', () => {
    it('should identify differential match when trial matches active case differentials', () => {
      const trial = {
        id: 'NCT05432101',
        title: 'Novel SGLT2 Inhibitor in Diabetic Neuropathy and Autonomic Stability',
        conditions: ['Diabetic Neuropathy', 'Autonomic Neuropathy'],
        summary: 'Phase 2 trial evaluating sensory nerve conduction and standing heart rate in adults aged 18 to 65.',
        interventions: ['Empagliflozin', 'Placebo']
      };

      const differentials = ['Diabetic Neuropathy', 'Fibromyalgia'];
      const result = evaluateTrialCriteria(trial, ['neuropathy'], differentials, { age: 45, gender: 'male' });

      expect(result.criteriaBreakdown.matchStatus).toBe('differential_match');
      expect(result.criteriaBreakdown.conditionMatch.matched).toBe(true);
      expect(result.criteriaBreakdown.conditionMatch.differentialOverlap).toContain('Diabetic Neuropathy');
      expect(result.criteriaBreakdown.ageCriteria.status).toBe('eligible');
      expect(result.matchScore).toBeGreaterThanOrEqual(65);
    });

    it('should flag age mismatch for pediatric trials when patient is adult', () => {
      const pediatricTrial = {
        id: 'NCT09876543',
        title: 'Safety of Oral Formulation in Pediatric Epilepsy and Children',
        conditions: ['Epilepsy'],
        summary: 'Enrollment for pediatric children and infant cohort under age 12.',
        interventions: ['Active Compound']
      };

      const result = evaluateTrialCriteria(pediatricTrial, ['epilepsy'], [], { age: 38, gender: 'female' });

      expect(result.criteriaBreakdown.ageCriteria.status).toBe('potential_mismatch');
      expect(result.criteriaBreakdown.ageCriteria.note).toContain('pediatric');
    });

    it('should flag sex mismatch when trial specifies single-gender cohort', () => {
      const femaleTrial = {
        id: 'NCT01122334',
        title: 'Longitudinal Evaluation in Women with Postpartum Thyroiditis',
        conditions: ['Thyroiditis'],
        summary: 'Trial restricted to maternal and female participants with postpartum thyroid changes.',
        interventions: ['Levothyroxine']
      };

      const malePatientResult = evaluateTrialCriteria(femaleTrial, ['thyroid'], [], { age: 35, gender: 'male' });
      expect(malePatientResult.criteriaBreakdown.genderCriteria.status).toBe('potential_mismatch');

      const femalePatientResult = evaluateTrialCriteria(femaleTrial, ['thyroid'], [], { age: 35, gender: 'female' });
      expect(femalePatientResult.criteriaBreakdown.genderCriteria.status).toBe('eligible');
    });
  });

  describe('Order 3 Remediation: Stage 3 Correction Queue Propagation', () => {
    it('should propagate Stage 3 corrections into Stage 6 tri-prong challenges and Stage 8 synthesis', () => {
      const conflictingFacts = [
        {
          id: 'fact_1',
          text: 'Serum Ferritin measured at 11 ng/ml with severe depletion',
          source: 'LabCorp 2026-01-10',
          category: 'measurement'
        },
        {
          id: 'fact_2',
          text: 'Serum Ferritin measured at 24 µg/l in regional hospital panel',
          source: 'Quest Diagnostics 2026-02-05',
          category: 'measurement'
        },
        {
          id: 'fact_3',
          text: 'Patient reports severe palpitations and tachycardia upon standing',
          source: 'Patient Reported',
          category: 'user_report'
        },
        {
          id: 'fact_4',
          text: 'Clinician notes document denies palpitations and denies tachycardia during visit',
          source: 'Clinic Notes',
          category: 'documented_clinician_assessment'
        }
      ];

      const payload = runClinicalReasoningPipeline({
        documentedFacts: conflictingFacts,
        primaryHypothesis: 'Iron Deficiency and Autonomic Dysregulation',
        uncertainties: ['Is the ferritin drop acute or chronic?'],
        missingLinks: ['Soluble transferrin receptor']
      });

      // Stage 3 must detect discrepancy
      expect(payload.stage3_correctionQueue.length).toBeGreaterThan(0);

      // Stage 6 tri-prong challenges must include the discrepancy in conflicting evidence
      const challenges = payload.stage6_balancedAssessments;
      expect(challenges.length).toBeGreaterThan(0);
      const hasDiscrepancyInChallenges = challenges.some(c =>
        c.conflictingEvidence.some(ce => ce.description.includes('Discrepancy detected in records'))
      );
      expect(hasDiscrepancyInChallenges).toBe(true);

      // Stage 8 synthesis must reflect discrepancies in limitations and practicalImplication
      const synthesis = payload.stage8_synthesis;
      expect(synthesis.limitations.some(l => l.includes('Discrepancy noted for clinician review'))).toBe(true);
      expect(synthesis.practicalImplication).toContain('record discrepanc');
    });
  });

  describe('Order 5 Remediation: Detective Map & Report Single Source of Truth', () => {
    it('should harmonize Detective report with active review findings without silent divergence', () => {
      const customReview = {
        primaryHypothesis: 'Mast Cell Activation with Postural Tachycardia',
        differentials: [
          { condition: 'Mast Cell Activation Syndrome', probability: 82, trend: 'increasing' },
          { condition: 'Hyperadrenergic POTS', probability: 74, trend: 'stable' }
        ],
        stage4_perspectives: [
          {
            specialty: 'Immunology & Allergy',
            doctorName: 'Mast Cell Board',
            uniqueContribution: 'Episodic flushing triggered by dietary histamine liberators',
            organ: 'Immune & Mast Cell Axis'
          },
          {
            specialty: 'Autonomic Neurology',
            doctorName: 'Dysautonomia Board',
            uniqueContribution: 'Postural adrenergic surge secondary to peripheral mast cell degranulation',
            organ: 'Cardiovascular & Autonomic Axis'
          }
        ],
        stage3_correctionQueue: [
          {
            id: 'corr_1',
            type: 'conflicting_values',
            title: 'Tryptase elevation discrepancy',
            discrepancyDescription: 'Baseline tryptase 4.2 vs flare tryptase 14.8',
            clinicalSignificance: 'Confirms episodic degranulation vs systemic mastocytosis',
            suggestedAction: 'Re-test within 2 hours of symptom flare'
          }
        ],
        stage8_synthesis: {
          mainFinding: 'Presentation is driven by mast cell mediator release triggering downstream autonomic instability.',
          practicalImplication: 'Bring histamine reaction log and 24-hour urine methylhistamine to clinical immunology.'
        }
      };

      const testCase = createCaseDraft({
        title: 'Mast Cell & Autonomic Case',
      });
      updateCaseDifferentials(testCase.id, [
        {
          id: 'diff_mcas',
          condition: 'Mast Cell Activation Syndrome',
          probability: 82,
          trend: 'up',
          supportingEvidence: ['Flushing after meals', 'Tryptase elevation'],
          refutingEvidence: [],
          nextBestTests: ['24-hour urine methylhistamine']
        }
      ]);
      const refreshedCase = getCase(testCase.id);

      const report = getConnectionDetectiveReport(customReview, refreshedCase);

      // Primary hypothesis must align with the active review
      expect(report.primaryHypothesis).toBe('Mast Cell Activation with Postural Tachycardia');

      // Specialist boards must be dynamically derived from the review perspectives
      expect(report.consensusDialogue.some(d => d.specialty === 'Immunology & Allergy')).toBe(true);
      expect(report.consensusDialogue.some(d => d.specialty === 'Autonomic Neurology')).toBe(true);

      // Clinical misses must include the Stage 3 correction queue discrepancy
      expect(report.clinicalMisses.some(m => m.whatWasMissed.includes('Tryptase elevation discrepancy') || m.whatWasMissed.includes('4.2 vs flare tryptase'))).toBe(true);

      // Assessment in SBAR must reflect the synthesis
      expect(report.doctorDossier.sbar.assessment).toContain('mast cell mediator release');
      expect(report.doctorDossier.sbar.recommendation).toContain('clinical immunology');
    });
  });
});
