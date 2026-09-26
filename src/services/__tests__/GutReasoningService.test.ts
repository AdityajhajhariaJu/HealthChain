import { beforeEach, describe, expect, it, vi } from 'vitest';
const { fetchGutReasoning } = vi.hoisted(() => ({ fetchGutReasoning: vi.fn() }));
vi.mock('../geminiService', () => ({ fetchGutReasoning }));
import { gutSynthesisFingerprint, reasonOverGutEvidence } from '../GutReasoningService';
const thread = { question: 'Is tea connected to my bloating?', intent: 'understand' as const, symptom: 'bloating' as const, focus: 'tea', symptomOnset: null, researchConcept: 'tea' };
const input = { thread, evidence: null, papers: [], topic: 'caffeine' as const, contextRecords: [], contextFingerprint: '[]' };
const answer = (extra = {}) => JSON.stringify({ headline: 'Timing alone cannot separate tea from other explanations', personalReading: 'You asked whether tea is connected to bloating.', personalSourceIds: ['question:current'], researchReading: 'Gas and bloating have several possible explanations; a meal diary cannot distinguish them by itself.', researchSourceIds: ['guide:niddk:bloating'], connectionReading: 'Tea is one part of the situation, but your question does not establish the cause. The timing and what else was in the drink would help narrow the discussion.', uncertainties: ['The drink ingredients and timing are unknown.'], nextAction: 'leave_open', nextReason: 'Clarify whether the same feeling happens without tea before drawing a conclusion.', followUpQuestion: 'Does the same bloating happen when you have not had tea?', followUpWhy: 'That helps separate a tea-specific pattern from a broader one.', citationPassageIds: ['question:current#0', 'guide:niddk:bloating#1'], ...extra });
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
    fetchGutReasoning.mockResolvedValue(answer({ citationPassageIds: ['question:current#0', 'paper:made-up#0'] }));
    await expect(reasonOverGutEvidence(input)).rejects.toThrow('outside this question');
  });
  it('rejects unknown passage selections even when a source ID exists', async () => {
    fetchGutReasoning.mockResolvedValue(answer({ citationPassageIds: ['question:current#999'] }));
    await expect(reasonOverGutEvidence(input)).rejects.toThrow('passage outside');
  });
  it('rejects an explicitly definitive cause even with valid quotations', async () => {
    fetchGutReasoning.mockResolvedValue(answer({ headline: 'Tea definitely causes your symptoms' }));
    await expect(reasonOverGutEvidence(input)).rejects.toThrow('too certain');
  });
  it('does not display invented research prose without research citations', async () => {
    fetchGutReasoning.mockResolvedValue(answer({ citationPassageIds: ['question:current#0'], researchReading: 'An invented study proves this.' }));
    const result = await reasonOverGutEvidence(input);
    expect(result.researchReading).toContain('No relevant research passage');
    expect(result.researchReading).not.toContain('invented');
  });
  it('includes user clarifications in the next request and freshness marker', async () => {
    fetchGutReasoning.mockResolvedValue(answer());
    const clarified = { ...thread, clarifications: [{ question: 'Does it happen without tea?', answer: 'Yes, after other meals too.' }] };
    await reasonOverGutEvidence({ ...input, thread: clarified });
    expect(fetchGutReasoning.mock.calls[0][0].clarifications[0].answer).toContain('other meals');
    expect(gutSynthesisFingerprint(clarified, null, '[]', 'caffeine')).not.toBe(gutSynthesisFingerprint(thread, null, '[]', 'caffeine'));
    expect(gutSynthesisFingerprint({ ...thread, researchConcept: 'coffee' }, null)).not.toBe(gutSynthesisFingerprint(thread, null));
  });
});
