import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildVersionedEvidenceSet,
  generateMeaningfulPerspectives,
  executeBoundedComparison,
  runSubstantiveDebateRound,
  MeaningfulPerspective,
  VersionedEvidenceSet
} from '../MultiPerspectiveReviewEngine';
import { SourceLinkedEvidence } from '../ClinicalReasoningEngine';

describe('MultiPerspectiveReviewEngine (Step 5)', () => {
  const mockFacts: SourceLinkedEvidence[] = [
    {
      id: 'f1',
      fact: 'Postural tachycardia of 132 bpm upon standing from sitting position',
      source: 'Patient log',
      category: 'user_report',
      allowedRole: 'Evidence of the reported experience',
      confidence: 'self_reported',
      timestamp: '2024-03-01T10:00:00Z',
    },
    {
      id: 'f2',
      fact: 'Serum Ferritin 14 ng/ml with normal CBC and hemoglobin',
      source: 'LabCorp Panel',
      category: 'extracted_finding',
      allowedRole: 'Provisional record content until checked',
      confidence: 'provisional',
      timestamp: '2024-03-02T11:00:00Z',
    },
    {
      id: 'f3',
      fact: 'Postprandial bloating, abdominal distension, and palpitations within 45 minutes of eating',
      source: 'Symptom journal',
      category: 'user_report',
      allowedRole: 'Evidence of the reported experience',
      confidence: 'self_reported',
      timestamp: '2024-03-03T13:30:00Z',
    },
    {
      id: 'f4',
      fact: 'Resting 12-lead ECG normal sinus rhythm with no ischemic ST changes',
      source: 'Cardiology Clinic',
      category: 'extracted_finding',
      allowedRole: 'Provisional record content until checked',
      confidence: 'verified',
      timestamp: '2024-03-04T09:00:00Z',
    },
  ];

  describe('1. Versioned Evidence Set', () => {
    it('generates a deterministic hash from facts and records count', () => {
      const setA = buildVersionedEvidenceSet(mockFacts, [{}, {}], 'fixed_snap_1');
      const setB = buildVersionedEvidenceSet(mockFacts, [{}, {}], 'fixed_snap_1');

      expect(setA.hash).toBe(setB.hash);
      expect(setA.facts.length).toBe(4);
      expect(setA.recordsCount).toBe(2);
    });

    it('changes hash if the facts change', () => {
      const setA = buildVersionedEvidenceSet(mockFacts, []);
      const setB = buildVersionedEvidenceSet(mockFacts.slice(0, 2), []);

      expect(setA.hash).not.toBe(setB.hash);
    });
  });

  describe('2. Meaningful Perspectives & 7 Mandatory Attributes', () => {
    let versionedEvidence: VersionedEvidenceSet;
    let perspectives: MeaningfulPerspective[];

    beforeEach(() => {
      versionedEvidence = buildVersionedEvidenceSet(mockFacts, [{}]);
      perspectives = generateMeaningfulPerspectives(versionedEvidence);
    });

    it('generates multiple distinct specialty perspectives', () => {
      expect(perspectives.length).toBeGreaterThanOrEqual(3);
      const specialties = perspectives.map(p => p.specialty);
      const uniqueSpecialties = new Set(specialties);
      expect(uniqueSpecialties.size).toBe(specialties.length);
    });

    it('Mandate 1: Prevents repetitive reviews by ensuring each perspective addresses a unique question', () => {
      const questions = perspectives.map(p => p.questionAddressed.trim().toLowerCase());
      const uniqueQuestions = new Set(questions);
      expect(uniqueQuestions.size).toBe(questions.length);
    });

    it('Mandate 2: Makes coverage inspectable against the versioned evidence set', () => {
      perspectives.forEach(p => {
        expect(p.evidenceConsidered).toBeInstanceOf(Array);
        expect(p.evidenceConsidered.length).toBeGreaterThan(0);
        // Each considered evidence point should be verifiable
        p.evidenceConsidered.forEach(ev => {
          expect(typeof ev).toBe('string');
          expect(ev.length).toBeGreaterThan(10);
        });
      });
    });

    it('Mandate 3: Explains unique contribution via substantive interpretation', () => {
      perspectives.forEach(p => {
        expect(p.interpretation).toBeDefined();
        expect(p.interpretation.length).toBeGreaterThan(30);
      });
      // Interpretations must not be identical across panels
      const interpretations = new Set(perspectives.map(p => p.interpretation));
      expect(interpretations.size).toBe(perspectives.length);
    });

    it('Mandate 4: Prevents one-sided reasoning by citing evidence against the perspective', () => {
      perspectives.forEach(p => {
        expect(p.evidenceAgainst).toBeInstanceOf(Array);
        expect(p.evidenceAgainst.length).toBeGreaterThan(0);
        p.evidenceAgainst.forEach(contra => {
          expect(contra.length).toBeGreaterThan(5);
        });
      });
    });

    it('Mandate 5: Identifies limits via missing information', () => {
      perspectives.forEach(p => {
        expect(p.missingInformation).toBeInstanceOf(Array);
        expect(p.missingInformation.length).toBeGreaterThan(0);
      });
    });

    it('Mandate 6: Enables actual integration via explicit questions for other perspectives', () => {
      perspectives.forEach(p => {
        const cross = p.questionForAnotherPerspective;
        expect(cross).toBeDefined();
        expect(cross.targetSpecialty).toBeDefined();
        expect(cross.question).toBeDefined();
        expect(cross.clinicalRationale).toBeDefined();
        expect(cross.targetSpecialty).not.toBe(p.specialty);
      });
    });

    it('Mandate 7: Makes future updates meaningful by defining what would change this interpretation', () => {
      perspectives.forEach(p => {
        expect(p.whatWouldChangeInterpretation).toBeDefined();
        expect(p.whatWouldChangeInterpretation.length).toBeGreaterThan(20);
      });
    });
  });

  describe('3. Bounded Cross-Perspective Comparison', () => {
    it('recognizes shared model assumptions in synthesis', () => {
      const versionedEvidence = buildVersionedEvidenceSet(mockFacts, [{}]);
      const perspectives = generateMeaningfulPerspectives(versionedEvidence);
      const comparison = executeBoundedComparison(perspectives, versionedEvidence);

      expect(comparison.sharedModelAssumptions.length).toBeGreaterThan(0);
      expect(comparison.sharedModelAssumptions[0]).toContain('Assumes');
    });

    it('keeps clinical disagreements visible with evidence needed to resolve', () => {
      const versionedEvidence = buildVersionedEvidenceSet(mockFacts, [{}]);
      const perspectives = generateMeaningfulPerspectives(versionedEvidence);
      const comparison = executeBoundedComparison(perspectives, versionedEvidence);

      expect(comparison.disagreements.length).toBeGreaterThan(0);
      comparison.disagreements.forEach(dispute => {
        expect(dispute.disputePoint).toBeDefined();
        expect(dispute.perspectivesInvolved.length).toBeGreaterThanOrEqual(2);
        expect(dispute.evidenceNeededToResolve.length).toBeGreaterThan(15);
      });
    });

    it('supports all 3 valid outcome types depending on evidence patterns', () => {
      // 1. Unifying explanation: connected symptoms without conflicts
      const unifiedFacts = [
        mockFacts[0], // tachycardia
        mockFacts[2], // bloating postprandial
      ];
      const evUnified = buildVersionedEvidenceSet(unifiedFacts);
      const perspUnified = generateMeaningfulPerspectives(evUnified);
      const compUnified = executeBoundedComparison(perspUnified, evUnified);
      expect(compUnified.outcomeType).toBe('unifying_explanation');

      // 2. Multiple unrelated issues: conflicting reports/normal labs alongside issues
      const conflictingFacts = [
        mockFacts[0], // tachycardia
        mockFacts[3], // normal ECG
        mockFacts[1], // ferritin low
      ];
      const evConflict = buildVersionedEvidenceSet(conflictingFacts);
      const perspConflict = generateMeaningfulPerspectives(evConflict);
      const compConflict = executeBoundedComparison(perspConflict, evConflict);
      expect(compConflict.outcomeType).toBe('multiple_unrelated_issues');

      // 3. Insufficient evidence: too few data points
      const sparseFacts = [mockFacts[0]];
      const evSparse = buildVersionedEvidenceSet(sparseFacts);
      const perspSparse = generateMeaningfulPerspectives(evSparse);
      const compSparse = executeBoundedComparison(perspSparse, evSparse);
      expect(compSparse.outcomeType).toBe('insufficient_evidence');
    });

    it('produces a clearer decision or question for the clinician', () => {
      const versionedEvidence = buildVersionedEvidenceSet(mockFacts);
      const perspectives = generateMeaningfulPerspectives(versionedEvidence);
      const comparison = executeBoundedComparison(perspectives, versionedEvidence);

      expect(comparison.clearDecisionOrQuestion).toBeDefined();
      expect(comparison.clearDecisionOrQuestion.startsWith('Decisive Next Step:')).toBe(true);
    });
  });

  describe('4. Substantive Debate Round (No Fixed 50 Stub)', () => {
    it('evaluates other perspectives without placeholder confidence numbers', async () => {
      const versionedEvidence = buildVersionedEvidenceSet(mockFacts);
      const result = await runSubstantiveDebateRound(
        'cardiology',
        'Autonomic Neurology & Cardiology',
        [],
        { 'Endocrine Panel': [], 'Gastroenterology Panel': [] },
        versionedEvidence
      );

      // Must not be the old deferred placeholder
      expect(result.substantiveCritique).not.toBe('Awaiting Orchestrator consensus.');
      expect(result.revisedHypothesis).not.toBe('Deferred to Board Orchestrator.');
      
      // Must produce qualitative bounded confidence, not arbitrary numbers
      expect(['elevated', 'demoted', 'unchanged_awaiting_testing']).toContain(result.confidenceAssessment);
      expect(result.confidenceRationale.length).toBeGreaterThan(15);
      
      // Must specify explicit resolving evidence
      expect(result.evidenceNeededToResolve.length).toBeGreaterThan(20);

      // Revising evidence basis must link to versioned evidence
      expect(result.revisingEvidenceBasis.length).toBeGreaterThan(0);
    });
  });
});
