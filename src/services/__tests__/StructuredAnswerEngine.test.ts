import { describe, it, expect } from 'vitest';
import { 
  buildStructuredClinicalAnswer, 
  sanitizeArbitraryPercentages, 
  StructuredClinicalAnswer 
} from '../StructuredAnswerEngine';

describe('StructuredAnswerEngine — Step 7: How the Actual Answer Should Look', () => {
  it('enforces Rule 4: sanitizes arbitrary percentages and fake probabilities', () => {
    const raw = 'There is an 82% match probability with mast cell activation syndrome with 95% confidence.';
    const sanitized = sanitizeArbitraryPercentages(raw);
    expect(sanitized).not.toContain('82%');
    expect(sanitized).not.toContain('95%');
    expect(sanitized).toContain('supported by documented evidence');
  });

  it('builds all 5 Progressive-Disclosure Answer Layers', () => {
    const answer: StructuredClinicalAnswer = buildStructuredClinicalAnswer({
      question: 'Why do my symptoms flare after eating fermented foods?',
      primaryHypothesis: 'Histamine Intolerance Consideration',
      executiveSummary: 'Documented postprandial flushing and tachycardia correlate with high-histamine intake. Serum tryptase was within normal limits during non-flare intervals. Further clinical correlation is warranted.',
      documentedFacts: [
        { fact: 'Flushing and tachycardia occur within 45 minutes of aged cheese consumption', source: 'Patient Diary', date: '2026-03-01', category: 'user_report' },
        { fact: 'Serum tryptase 4.2 ng/mL (Reference: < 11.5 ng/mL)', source: 'LabCorp Panel', date: '2026-02-15', category: 'recorded_measurement' },
        { fact: 'Normal sinus rhythm confirmed on resting ECG', source: 'Cardiology Note', date: '2026-01-20', category: 'documented_clinician_assessment' },
      ],
      uncertainties: ['Diamine oxidase (DAO) enzyme activity level'],
      missingLinks: ['Urinary N-methylhistamine during an acute flare episode'],
      questionsForClinician: [
        'Could these recurring postprandial symptoms reflect histamine intolerance or mast cell activation?',
        'Would checking 24-hour urinary methylhistamine during an acute episode help differentiate these etiologies?'
      ],
    });

    // Layer 1: Main answer
    expect(answer.layer1_mainAnswer.conciseAnswer).toBeDefined();
    expect(answer.layer1_mainAnswer.conciseAnswer.length).toBeGreaterThan(20);
    expect(answer.layer1_mainAnswer.fullSynthesis).toBeDefined();

    // Layer 2: Why this matters in my case
    expect(answer.layer2_whyThisMatters.strongestObservations.length).toBeGreaterThanOrEqual(1);
    expect(answer.layer2_whyThisMatters.strongestObservations.length).toBeLessThanOrEqual(3);
    expect(answer.layer2_whyThisMatters.sourcePassages.length).toBe(3);
    expect(answer.layer2_whyThisMatters.sourcePassages[0].source).toBe('Patient Diary');

    // Layer 3: Other explanations
    expect(answer.layer3_otherExplanations.plausibleAlternatives.length).toBeGreaterThanOrEqual(1);
    expect(answer.layer3_otherExplanations.balancedEvidence.length).toBeGreaterThanOrEqual(1);
    // Mandate: explicit relationship statuses (supported/proposed/contradicted/unknown)
    expect(answer.layer3_otherExplanations.relationshipStatuses.length).toBeGreaterThanOrEqual(1);
    const statuses = answer.layer3_otherExplanations.relationshipStatuses.map(r => r.status);
    expect(statuses.some(s => ['supported', 'proposed', 'contradicted', 'unknown'].includes(s))).toBe(true);

    // Layer 4: What we still need
    expect(answer.layer4_whatWeStillNeed.criticalGaps.length).toBeGreaterThanOrEqual(1);
    expect(answer.layer4_whatWeStillNeed.criticalGaps.length).toBeLessThanOrEqual(2);
    expect(answer.layer4_whatWeStillNeed.completeMissingList.length).toBeGreaterThanOrEqual(2);

    // Layer 5: Next step
    expect(answer.layer5_nextStep.chosenAction).toBeDefined();
    expect(answer.layer5_nextStep.doctorVisitBrief).toBeDefined();
    // Rule 1: Replace "Ask your doctor" with specific question, why it matters, and relevant records
    expect(answer.layer5_nextStep.doctorVisitBrief.specificQuestion).toContain('histamine');
    expect(answer.layer5_nextStep.doctorVisitBrief.whyItMatters.length).toBeGreaterThan(15);
    expect(answer.layer5_nextStep.doctorVisitBrief.relevantRecords.length).toBeGreaterThan(0);
  });

  it('enforces User Priority control over the chosen next action (Step 9 Integration)', () => {
    const answer = buildStructuredClinicalAnswer({
      question: 'General review',
      primaryHypothesis: 'Dysautonomia consideration',
      userPriority: 'Preventing dizzy spells upon standing in the morning',
      questionsForClinician: ['Could orthostatic vitals confirm postural tachycardia?'],
    });

    expect(answer.layer5_nextStep.chosenAction).toContain('Preventing dizzy spells upon standing in the morning');
  });

  it('enforces Rule 3: explicitly surfaces contradictions between perspectives', () => {
    const answer = buildStructuredClinicalAnswer({
      primaryHypothesis: 'Complex Multi-system Presentation',
      boundedComparison: {
        disagreements: [
          {
            perspectiveA: 'Cardiology Board',
            perspectiveB: 'Neurology Board',
            issue: 'Tachycardia attributed to primary POTS vs secondary reflex response to hypovolemia',
            resolutionNeed: 'Formal tilt table testing with autonomic reflex screening',
          }
        ]
      }
    });

    const contradictedRel = answer.layer3_otherExplanations.relationshipStatuses.find(r => r.status === 'contradicted');
    expect(contradictedRel).toBeDefined();
    expect(contradictedRel?.connection).toContain('Cardiology Board vs Neurology Board');
    expect(contradictedRel?.rationale).toContain('POTS');
  });
});
