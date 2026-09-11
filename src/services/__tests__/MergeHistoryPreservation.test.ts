import { describe, it, expect } from 'vitest';
import { mergeCaseItems } from '../CaseMergeEngine';
import type { CaseItem } from '../CaseEngine';
import type { MedicalRecord } from '../MedicalRecordEngine';
import type { ReviewSnapshot } from '../ClinicalReasoningEngine';
import type { ClinicalQuestion, TimelineEvent, CaseAction, AppointmentBrief } from '../CaseEngine';

describe('P1 Finding 3: Canonical Merge Non-Destructive History Preservation', () => {
  const baseCase: CaseItem = {
    id: 'case_history_test_1',
    title: 'Comprehensive Chronic History Case',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-11T10:00:00Z',
    revision: 10,
    chiefComplaint: 'Multi-year complex presentation',
    symptoms: [],
    timeline: [],
    events: [],
    questions: [],
    records: [],
    reviews: [],
    actions: [],
  };

  it('preserves all 51 unique medical records without silent 50-item truncation', () => {
    // 30 records on local, 21 new records on remote = 51 unique records
    const localRecords: MedicalRecord[] = Array.from({ length: 30 }, (_, i) => ({
      id: `record_local_${i + 1}`,
      title: `Lab Report ${i + 1}`,
      extractedText: `Details for record ${i + 1}`,
      findings: [`Finding ${i + 1}`],
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      createdAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      category: 'lab_result',
    } as unknown as MedicalRecord));

    const remoteRecords: MedicalRecord[] = Array.from({ length: 21 }, (_, i) => ({
      id: `record_remote_${i + 1}`,
      title: `Remote Specialist Report ${i + 1}`,
      extractedText: `Details for remote record ${i + 1}`,
      findings: [`Remote finding ${i + 1}`],
      date: `2026-02-${String(i + 1).padStart(2, '0')}`,
      createdAt: `2026-02-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      category: 'specialist_consult',
    } as unknown as MedicalRecord));

    const localCase: CaseItem = { ...baseCase, medicalRecords: localRecords };
    const remoteCase: CaseItem = { ...baseCase, medicalRecords: remoteRecords, revision: 11 };

    const { merged } = mergeCaseItems(localCase, remoteCase);

    expect(merged.medicalRecords).toBeDefined();
    expect(merged.medicalRecords!.length).toBe(51);
  });

  it('preserves all 105 unique clinical questions without silent 100-item truncation', () => {
    const localQuestions: ClinicalQuestion[] = Array.from({ length: 60 }, (_, i) => ({
      id: `q_local_${i + 1}`,
      questionText: `Question ${i + 1} from endocrinology?`,
      raisedBySpecialty: 'Endocrinology',
      status: 'open',
      supportingEvidenceIds: [],
    }));

    const remoteQuestions: ClinicalQuestion[] = Array.from({ length: 45 }, (_, i) => ({
      id: `q_remote_${i + 1}`,
      questionText: `Question ${i + 1} from rheumatology?`,
      raisedBySpecialty: 'Rheumatology',
      status: 'open',
      supportingEvidenceIds: [],
    }));

    const localCase: CaseItem = { ...baseCase, questions: localQuestions };
    const remoteCase: CaseItem = { ...baseCase, questions: remoteQuestions, revision: 11 };

    const { merged } = mergeCaseItems(localCase, remoteCase);

    expect(merged.questions).toBeDefined();
    expect(merged.questions!.length).toBe(105);
  });

  it('preserves all 105 unique timeline events without silent 100-item truncation', () => {
    const localEvents: TimelineEvent[] = Array.from({ length: 60 }, (_, i) => ({
      id: `ev_local_${i + 1}`,
      label: `Event ${i + 1}`,
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T10:00:00Z`,
      note: `Local event note ${i + 1}`,
    }));

    const remoteEvents: TimelineEvent[] = Array.from({ length: 45 }, (_, i) => ({
      id: `ev_remote_${i + 1}`,
      label: `Remote Event ${i + 1}`,
      date: `2026-02-${String((i % 28) + 1).padStart(2, '0')}T10:00:00Z`,
      note: `Remote event note ${i + 1}`,
    }));

    const localCase: CaseItem = { ...baseCase, events: localEvents };
    const remoteCase: CaseItem = { ...baseCase, events: remoteEvents, revision: 11 };

    const { merged } = mergeCaseItems(localCase, remoteCase);

    expect(merged.events).toBeDefined();
    expect(merged.events!.length).toBe(105);
  });

  it('preserves all 55 unique review snapshots without silent 50-item truncation', () => {
    const localReviews: ReviewSnapshot[] = Array.from({ length: 30 }, (_, i) => ({
      id: `rev_local_${i + 1}`,
      createdAt: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T12:00:00Z`,
      executiveSummary: `Review summary ${i + 1}`,
      primaryHypothesis: `Hypothesis ${i + 1}`,
      perspectives: [],
    } as unknown as ReviewSnapshot));

    const remoteReviews: ReviewSnapshot[] = Array.from({ length: 25 }, (_, i) => ({
      id: `rev_remote_${i + 1}`,
      createdAt: `2026-02-${String((i % 28) + 1).padStart(2, '0')}T12:00:00Z`,
      executiveSummary: `Remote summary ${i + 1}`,
      primaryHypothesis: `Remote hypothesis ${i + 1}`,
      perspectives: [],
    } as unknown as ReviewSnapshot));

    const localCase: CaseItem = { ...baseCase, reviews: localReviews };
    const remoteCase: CaseItem = { ...baseCase, reviews: remoteReviews, revision: 11 };

    const { merged } = mergeCaseItems(localCase, remoteCase);

    expect(merged.reviews).toBeDefined();
    expect(merged.reviews!.length).toBe(55);
  });

  it('preserves all 55 unique case actions without silent 50-item truncation', () => {
    const localActions: CaseAction[] = Array.from({ length: 30 }, (_, i) => ({
      id: `act_local_${i + 1}`,
      label: `Action ${i + 1}`,
      completed: false,
      priority: 'routine' as const,
    }));

    const remoteActions: CaseAction[] = Array.from({ length: 25 }, (_, i) => ({
      id: `act_remote_${i + 1}`,
      label: `Remote Action ${i + 1}`,
      completed: true,
      priority: 'high' as const,
    }));

    const localCase: CaseItem = { ...baseCase, actions: localActions };
    const remoteCase: CaseItem = { ...baseCase, actions: remoteActions, revision: 11 };

    const { merged } = mergeCaseItems(localCase, remoteCase);

    expect(merged.actions).toBeDefined();
    expect(merged.actions!.length).toBe(55);
  });

  it('preserves appointment brief history without 20-item truncation', () => {
    const historyList: AppointmentBrief[] = Array.from({ length: 25 }, (_, i) => ({
      id: `brief_${i + 1}`,
      generatedAt: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T10:00:00Z`,
      sourceFingerprint: `fp_${i + 1}`,
      headline: `Brief ${i + 1}`,
      clinicalSummary: `Summary ${i + 1}`,
      keyFindings: [],
      questionsForDoctor: [],
    } as unknown as AppointmentBrief));

    const localCase: CaseItem = {
      ...baseCase,
      appointmentBriefs: {
        current: historyList[0],
        history: historyList.slice(1),
      },
    };

    const remoteCase: CaseItem = {
      ...baseCase,
      appointmentBriefs: {
        current: historyList[0],
        history: historyList.slice(1),
      },
      revision: 11,
    };

    const { merged } = mergeCaseItems(localCase, remoteCase);

    expect(merged.appointmentBriefs).toBeDefined();
    expect(merged.appointmentBriefs!.history!.length).toBe(24);
  });
});
