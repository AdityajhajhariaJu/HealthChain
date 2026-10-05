import { beforeEach, describe, expect, it, vi } from 'vitest';
const { fetchGutReasoning } = vi.hoisted(() => ({ fetchGutReasoning: vi.fn() }));
vi.mock('../geminiService', () => ({ fetchGutReasoning }));
vi.mock('../ProfileEngine', () => ({
  getProfileKey: () => 'hc_unified_profile_acct',
  getProfileEngineState: () => ({ activeId: 'profile_1' }),
  getProfile: () => ({}),
  saveProfile: vi.fn(),
}));
vi.mock('../RunContext', () => ({ getAccountScope: () => 'acct' }));
import {
  gutResearchFingerprint,
  gutSynthesisFingerprint,
  reasonOverGutEvidence,
  selectGutReasoningOccasions,
} from '../GutReasoningService';
import { deriveGutEvidence } from '../GutResolutionService';
import type { GutQuestionThread } from '../GutResolutionService';
import type { GutResearchPaper } from '../GutResearchService';
const thread = {
  question: 'Is tea connected to my bloating?',
  intent: 'understand' as const,
  symptom: 'bloating' as const,
  focus: 'tea',
  symptomOnset: null,
  researchConcept: 'tea',
};
const input = {
  thread,
  evidence: null,
  papers: [],
  topic: 'caffeine' as const,
  contextRecords: [],
  contextFingerprint: '[]',
};
const savedThread: GutQuestionThread = {
  ...thread,
  id: 'q',
  schemaVersion: 1,
  status: 'open',
  selectedStep: null,
  reflection: null,
  reviewedEvidence: null,
  createdAt: '2026-10-02T08:00:00Z',
  updatedAt: '2026-10-02T08:00:00Z',
  ownerKey: 'hc_unified_profile_acct',
  profileId: 'profile_1',
  excludedMealIds: [],
};
const answer = (extra = {}) =>
  JSON.stringify({
    headline: 'Timing alone cannot separate tea from other explanations',
    personalReading: 'You asked whether tea is connected to bloating.',
    personalSourceIds: ['question:current'],
    researchReading:
      'Gas and bloating have several possible explanations; a meal diary cannot distinguish them by itself.',
    researchSourceIds: ['guide:niddk:bloating'],
    connectionReading:
      'Tea is one part of the situation, but your question does not establish the cause. The timing and what else was in the drink would help narrow the discussion.',
    uncertainties: ['The drink ingredients and timing are unknown.'],
    nextAction: 'leave_open',
    nextReason: 'Clarify whether the same feeling happens without tea before drawing a conclusion.',
    followUpQuestion: 'Does the same bloating happen when you have not had tea?',
    followUpWhy: 'That helps separate a tea-specific pattern from a broader one.',
    citationPassageIds: ['question:current#0', 'guide:niddk:bloating#1'],
    ...extra,
  });
describe('Gut reasoning provenance and interpretation', () => {
  beforeEach(() => fetchGutReasoning.mockReset());
  it('keeps a useful model interpretation even with no saved meals', async () => {
    fetchGutReasoning.mockResolvedValue(answer());
    const result = await reasonOverGutEvidence(input);
    expect(result.headline).toBe('Timing alone cannot separate tea from other explanations');
    expect(result.connectionReading).toContain('Tea is one part');
    expect(result.followUpQuestion).toContain('not had tea');
    expect(result.researchSourceIds).toEqual(['guide:niddk:bloating']);
    expect(fetchGutReasoning.mock.calls[0][0].generalGuidance[0].text).toContain('NIDDK');
  });
  it('rejects fabricated source IDs rather than displaying an unsupported interpretation', async () => {
    fetchGutReasoning.mockResolvedValue(
      answer({ citationPassageIds: ['question:current#0', 'paper:made-up#0'] })
    );
    await expect(reasonOverGutEvidence(input)).rejects.toThrow('outside this question');
  });
  it('rejects unknown passage selections even when a source ID exists', async () => {
    fetchGutReasoning.mockResolvedValue(answer({ citationPassageIds: ['question:current#999'] }));
    await expect(reasonOverGutEvidence(input)).rejects.toThrow('passage outside');
  });
  it('rejects an explicitly definitive cause even with valid quotations', async () => {
    fetchGutReasoning.mockResolvedValue(
      answer({ headline: 'Tea definitely causes your symptoms' })
    );
    await expect(reasonOverGutEvidence(input)).rejects.toThrow('too certain');
  });
  it('accepts a future record assessment without asserting a diagnosis', async () => {
    fetchGutReasoning.mockResolvedValue(answer({
      nextReason: 'Clarifying the actual outcome for the reported occasion would resolve the conflict and allow for a more definitive assessment.',
    }));
    const result = await reasonOverGutEvidence(input);
    expect(result.nextReason).toContain('more definitive assessment');
    expect(result.nextAction).toBe('leave_open');
  });
  it('does not display invented research prose without research citations', async () => {
    fetchGutReasoning.mockResolvedValue(
      answer({
        citationPassageIds: ['question:current#0'],
        researchReading: 'An invented study proves this.',
      })
    );
    const result = await reasonOverGutEvidence(input);
    expect(result.researchReading).toContain('No relevant research passage');
    expect(result.researchReading).not.toContain('invented');
  });
  it('includes user clarifications in the next request and freshness marker', async () => {
    fetchGutReasoning.mockResolvedValue(answer());
    const clarified = {
      ...thread,
      clarifications: [
        { question: 'Does it happen without tea?', answer: 'Yes, after other meals too.' },
      ],
    };
    await reasonOverGutEvidence({ ...input, thread: clarified });
    expect(fetchGutReasoning.mock.calls[0][0].clarifications[0].answer).toContain('other meals');
    expect(gutSynthesisFingerprint(clarified, null, '[]', 'caffeine')).not.toBe(
      gutSynthesisFingerprint(thread, null, '[]', 'caffeine')
    );
    expect(gutSynthesisFingerprint({ ...thread, researchConcept: 'coffee' }, null)).not.toBe(
      gutSynthesisFingerprint(thread, null)
    );
  });
  it('retains negative reports in a bounded request with twelve positive records', async () => {
    const meals = Array.from({ length: 14 }, (_, index) => ({
      id: `stable-tea-${index}`,
      name: 'Tea',
      date: `2026-09-${String(index + 1).padStart(2, '0')}`,
      time: null,
      reactionType: index < 12 ? 'bloat' : null,
      reaction: null,
    }));
    const observations = meals
      .slice(12)
      .map((meal) => ({
        id: `report-${meal.id}`,
        ownerId: 'acct',
        profileId: 'profile_1',
        deletedAt: null,
        sourceRecordId: meal.id,
        payload: { kind: 'daily_checkin', answers: { bloating: 'no' }, localDate: meal.date },
        localDate: meal.date,
        timePrecision: 'date_only',
        revision: 1,
      }));
    const evidence = deriveGutEvidence(savedThread, { meals, days: [] }, observations as any);
    expect(evidence.support).toBe(12);
    expect(evidence.tension).toBe(2);
    expect(
      selectGutReasoningOccasions(evidence).filter((item) => item.answer === 'no')
    ).toHaveLength(2);
    fetchGutReasoning.mockResolvedValue(answer());
    const result = await reasonOverGutEvidence({ ...input, evidence });
    const payload = fetchGutReasoning.mock.calls[0][0];
    expect(payload.personalRecords).toHaveLength(12);
    expect(payload.recordCoverage).toMatchObject({ total: 14, included: 12, omitted: 2 });
    expect(
      payload.personalRecords.filter((item: { outcome: string }) =>
        item.outcome.includes('without bloating')
      )
    ).toHaveLength(2);
    expect(result.personalReading).toBe(evidence.answer);
  });
  it('forwards confirmed preparation and onset, and compares only timed occurrences', async () => {
    const prepared: GutQuestionThread = {
      ...savedThread,
      symptomOnset: { occurredAt: '2026-10-02T08:00:00Z', precision: 'exact' },
    };
    const evidence = deriveGutEvidence(
      prepared,
      {
        meals: [
          {
            id: 'timed',
            name: 'Tea',
            date: '2026-10-02',
            time: '14:30',
            occurredAt: '2026-10-02T09:00:00Z',
            timePrecision: 'exact',
            reactionType: 'bloat',
            reaction: null,
            preparation: {
              kind: 'ingredient_or_substitution',
              detail: 'Lactose-free cow milk',
              source: 'user_confirmed',
            },
          },
        ],
        days: [],
      },
      []
    );
    fetchGutReasoning.mockResolvedValue(answer());
    await reasonOverGutEvidence({ ...input, thread: prepared, evidence });
    const payload = fetchGutReasoning.mock.calls[0][0];
    expect(payload.reportedSymptomOnset.occurredAt).toBe('2026-10-02T08:00:00Z');
    expect(payload.personalRecords[0].confirmedPreparation.detail).toContain('Lactose-free');
    expect(payload.personalRecords[0].sequence).toContain('after the reported symptom onset');
  });
  it('provides urgent guidance without a model request or follow-up question', async () => {
    const result = await reasonOverGutEvidence({
      ...input,
      thread: { ...thread, question: 'I have severe constant stomach pain right now.' },
    });
    expect(fetchGutReasoning).not.toHaveBeenCalled();
    expect(result.nextReason).toContain('emergency services now');
    expect(result.followUpQuestion).toBe('');
  });
  it('rejects an invented record count even with valid passage IDs', async () => {
    fetchGutReasoning.mockResolvedValue(
      answer({ connectionReading: 'Your 12 saved records all report bloating.' })
    );
    await expect(reasonOverGutEvidence(input)).rejects.toThrow('not supported');
  });
  it('changes freshness when a paper abstract or correction changes despite an unchanged ID', () => {
    const paper = {
      id: '123',
      title: 'Milk study',
      abstract: 'Original abstract',
      publicationTypes: [],
      publicationDate: '2026-01-01',
    } as unknown as GutResearchPaper;
    expect(gutResearchFingerprint([paper])).not.toBe(
      gutResearchFingerprint([{ ...paper, abstract: 'Corrected abstract' }])
    );
    expect(gutResearchFingerprint([paper])).not.toBe(
      gutResearchFingerprint([{ ...paper, correctionNotice: 'Retracted' }])
    );
  });
});
