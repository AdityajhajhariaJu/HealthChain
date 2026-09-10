import { describe, it, expect } from 'vitest';
import {
  INFORMATION_CATEGORY_REGISTRY,
  ClinicalInformationCategory,
  validateCategorizedItem,
  classifyClinicalInformation,
  partitionBeforeReasoning,
  UserReportItem,
  ExtractedFindingItem,
  RecordedMeasurementItem,
  DocumentedClinicianAssessmentItem,
  AIConsiderationItem,
  ExternalEvidenceItem,
  OpenQuestionItem,
  OutcomeItem,
} from '../ClinicalInformationClassifier';

describe('ClinicalInformationClassifier (Step 3: Categorise Information Before Reasoning)', () => {
  const ALL_8_CATEGORIES: ClinicalInformationCategory[] = [
    'user_report',
    'recorded_measurement',
    'extracted_finding',
    'documented_clinician_assessment',
    'ai_consideration',
    'external_evidence',
    'open_question',
    'outcome',
  ];

  it('registers all 8 canonical categories with exact allowed roles from reference specification', () => {
    for (const cat of ALL_8_CATEGORIES) {
      const spec = INFORMATION_CATEGORY_REGISTRY[cat];
      expect(spec).toBeDefined();
      expect(spec.requiredFields.length).toBeGreaterThan(0);
      expect(spec.allowedRole).toBeTruthy();
    }

    expect(INFORMATION_CATEGORY_REGISTRY.user_report.allowedRole).toBe(
      'Evidence of the reported experience'
    );
    expect(INFORMATION_CATEGORY_REGISTRY.recorded_measurement.allowedRole).toBe(
      'Evidence of that measurement'
    );
    expect(INFORMATION_CATEGORY_REGISTRY.extracted_finding.allowedRole).toBe(
      'Provisional record content until checked'
    );
    expect(INFORMATION_CATEGORY_REGISTRY.documented_clinician_assessment.allowedRole).toBe(
      'A dated clinician assessment—not automatically permanent truth'
    );
    expect(INFORMATION_CATEGORY_REGISTRY.ai_consideration.allowedRole).toBe(
      'A proposal to examine'
    );
    expect(INFORMATION_CATEGORY_REGISTRY.external_evidence.allowedRole).toBe(
      'General evidence with applicability limits'
    );
    expect(INFORMATION_CATEGORY_REGISTRY.open_question.allowedRole).toBe(
      'An unresolved task'
    );
    expect(INFORMATION_CATEGORY_REGISTRY.outcome.allowedRole).toBe(
      'Follow-up that can update the case'
    );
  });

  it('validates complete required metadata for Extracted Finding and catches missing fields', () => {
    const validFinding: ExtractedFindingItem = {
      id: 'find_1',
      category: 'extracted_finding',
      text: 'Hemoglobin A1c: 5.9%',
      originalFile: 'Quest_Diagnostics_Labs_2024.pdf',
      page: 2,
      units: '%',
      extractionStatus: 'checked',
      createdAt: new Date().toISOString(),
      allowedRole: 'Provisional record content until checked',
    };
    const validCheck = validateCategorizedItem(validFinding);
    expect(validCheck.isValid).toBe(true);
    expect(validCheck.missingFields).toHaveLength(0);

    const invalidFinding: any = {
      id: 'find_2',
      category: 'extracted_finding',
      text: 'Ferritin: 18 ng/mL',
      // missing originalFile and page and extractionStatus
      createdAt: new Date().toISOString(),
      allowedRole: 'Provisional record content until checked',
    };
    const invalidCheck = validateCategorizedItem(invalidFinding);
    expect(invalidCheck.isValid).toBe(false);
    expect(invalidCheck.missingFields).toContain('originalFile');
    expect(invalidCheck.missingFields).toContain('page');
    expect(invalidCheck.missingFields).toContain('extractionStatus');
  });

  it('validates AI Consideration requires explicit limitations and supporting evidence IDs', () => {
    const validAI: AIConsiderationItem = {
      id: 'ai_1',
      category: 'ai_consideration',
      text: 'Observations suggest possible gluten-sensitive enteropathy',
      supportingEvidenceIds: ['find_1', 'user_1'],
      limitations: ['Non-biopsy validated proposal', 'Requires anti-tTG IgA confirmation'],
      modelVersion: 'Jarvis Clinical Engine v2.4',
      createdAt: new Date().toISOString(),
      allowedRole: 'A proposal to examine',
    };
    expect(validateCategorizedItem(validAI).isValid).toBe(true);

    const invalidAI: any = {
      id: 'ai_2',
      category: 'ai_consideration',
      text: 'Patient has celiac disease',
      supportingEvidenceIds: [], // empty
      limitations: [], // empty
      modelVersion: '', // empty
      createdAt: new Date().toISOString(),
      allowedRole: 'A proposal to examine',
    };
    const check = validateCategorizedItem(invalidAI);
    expect(check.isValid).toBe(false);
    expect(check.missingFields).toContain('supportingEvidenceIds');
    expect(check.missingFields).toContain('limitations');
    expect(check.missingFields).toContain('modelVersion');
  });

  it('heuristically classifies distinct raw clinical text snippets into the correct category', () => {
    // 1. User report
    const userItem = classifyClinicalInformation({
      text: 'I felt dizzy and nauseous after eating lunch.',
      author: 'Patient',
    });
    expect(userItem.category).toBe('user_report');
    expect(userItem.allowedRole).toBe('Evidence of the reported experience');

    // 2. Recorded measurement
    const measureItem = classifyClinicalInformation({
      text: 'Resting pulse recorded at 104 bpm.',
      source: 'Apple Watch',
    });
    expect(measureItem.category).toBe('recorded_measurement');
    expect(measureItem.allowedRole).toBe('Evidence of that measurement');

    // 3. Extracted finding
    const extractItem = classifyClinicalInformation({
      text: 'TSH level was 4.2 mIU/L.',
      source: 'Endocrine_Panel.pdf',
      page: 1,
    });
    expect(extractItem.category).toBe('extracted_finding');
    expect(extractItem.allowedRole).toBe('Provisional record content until checked');

    // 4. Documented clinician assessment
    const docItem = classifyClinicalInformation({
      text: 'Assessment: Mild reactive gastritis vs functional dyspepsia.',
      source: 'Dr. Mehta Gastro Clinic Note',
    });
    expect(docItem.category).toBe('documented_clinician_assessment');
    expect(docItem.allowedRole).toBe(
      'A dated clinician assessment—not automatically permanent truth'
    );

    // 5. External evidence
    const trialItem = classifyClinicalInformation({
      text: 'NCT048218: Phase III randomized trial on micro-dose immunotherapy.',
      source: 'ClinicalTrials.gov',
      identifier: 'NCT048218',
    });
    expect(trialItem.category).toBe('external_evidence');
    expect(trialItem.allowedRole).toBe('General evidence with applicability limits');

    // 6. Open question
    const questionItem = classifyClinicalInformation({
      text: 'Did the joint stiffness precede the rash by more than two weeks?',
    });
    expect(questionItem.category).toBe('open_question');
    expect(questionItem.allowedRole).toBe('An unresolved task');

    // 7. Outcome
    const outcomeItem = classifyClinicalInformation({
      text: 'At the visit, we agreed to discontinue omeprazole and monitor rebound acidity.',
    });
    expect(outcomeItem.category).toBe('outcome');
    expect(outcomeItem.allowedRole).toBe('Follow-up that can update the case');
  });

  it('pre-reasoning gateway partitions mixed batch and computes category distribution', () => {
    const rawBatch = [
      { fact: 'I noticed palpitations around 2 PM.', source: 'User Symptom Log' },
      { fact: 'Heart rate 112 bpm during palpitation episode.', source: 'Wearable ECG' },
      { fact: 'Serum Potassium: 3.4 mmol/L.', source: 'Metabolic_Panel.pdf', page: 2 },
      { fact: 'Dr. Sharma note: Likely sinus tachycardia secondary to mild hypokalemia.', source: 'Cardiology Clinic Note' },
      { fact: 'These observations may be related to excessive diuretic intake.', source: 'Jarvis AI' },
      { fact: 'PubMed PMID:3145129: Hypokalemia-induced cardiac arrhythmias in outpatients.', source: 'PubMed Journal' },
      { fact: 'Did the patient miss a dose of potassium supplement yesterday?', source: 'Clinical Gap' },
      { fact: 'At the visit, we agreed to adjust diuretic dosing and recheck electrolytes in 2 weeks.', source: 'Follow-up Brief' },
    ];

    const partitioned = partitionBeforeReasoning(rawBatch);

    expect(partitioned.userReports).toHaveLength(1);
    expect(partitioned.measurements).toHaveLength(1);
    expect(partitioned.extractedFindings).toHaveLength(1);
    expect(partitioned.clinicianAssessments).toHaveLength(1);
    expect(partitioned.aiConsiderations).toHaveLength(1);
    expect(partitioned.externalEvidence).toHaveLength(1);
    expect(partitioned.openQuestions).toHaveLength(1);
    expect(partitioned.outcomes).toHaveLength(1);

    expect(partitioned.summary.user_report).toBe(1);
    expect(partitioned.summary.recorded_measurement).toBe(1);
    expect(partitioned.summary.extracted_finding).toBe(1);
    expect(partitioned.summary.documented_clinician_assessment).toBe(1);
    expect(partitioned.summary.ai_consideration).toBe(1);
    expect(partitioned.summary.external_evidence).toBe(1);
    expect(partitioned.summary.open_question).toBe(1);
    expect(partitioned.summary.outcome).toBe(1);
  });
});
