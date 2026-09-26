import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GutResearchPaper } from '../GutResearchService';

const { fetchGutReasoning } = vi.hoisted(() => ({ fetchGutReasoning: vi.fn() }));
vi.mock('../geminiService', () => ({ fetchGutReasoning }));

import { gutSynthesisFingerprint, reasonOverGutEvidence } from '../GutReasoningService';

const thread = { question: 'Is tea connected to my bloating?', intent: 'understand' as const, symptom: 'bloating' as const, focus: 'tea', symptomOnset: null, researchConcept: 'tea' };
const modelResult = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  headline: 'Tea definitely causes your symptoms',
  personalReading: 'You have a confirmed allergy.',
  personalSourceIds: ['paper:123'],
  researchReading: 'The paper proves tea causes symptoms.',
  researchQuote: '',
  researchSourceIds: [],
  connectionReading: 'Definite cause.',
  uncertainties: ['You should stop eating.'],
  nextAction: 'leave_open',
  nextReason: 'Stop tea.',
  ...overrides,
});

describe('Gut reasoning source gate', () => {
  beforeEach(() => fetchGutReasoning.mockReset());

  it('does not render unsupported personal or research assertions from a model response', async () => {
    fetchGutReasoning.mockResolvedValue(modelResult());
    const result = await reasonOverGutEvidence({ thread, evidence: null, papers: [], topic: 'caffeine', contextRecords: [], contextFingerprint: '[]' });
    expect(result.headline).toBe('This question remains open');
    expect(result.personalReading).toMatch(/No symptom-specific meal report/);
    expect(result.researchReading).toMatch(/No paper was retrieved/);
    expect(result.personalSourceIds).toEqual([]);
    expect(result.researchSourceIds).toEqual([]);
    expect(result.uncertainties).toEqual([]);
  });

  it('requires an exact short excerpt in a cited abstract before showing research text', async () => {
    const paper = { id: '123', title: 'Tea and digestive symptoms', url: 'https://pubmed.ncbi.nlm.nih.gov/123/', year: '2024', journal: 'Example', publicationTypes: [], correctionNotice: null, abstract: 'Participants reported a range of digestive symptoms after tea consumption.' } as unknown as GutResearchPaper;
    fetchGutReasoning.mockResolvedValue(modelResult({ researchQuote: 'Tea cured everyone.', researchSourceIds: ['paper:123'] }));
    const input = { thread, evidence: null, papers: [paper], topic: 'caffeine' as const, contextRecords: [], contextFingerprint: '[]' };
    const rejected = await reasonOverGutEvidence(input);
    expect(rejected.researchSourceIds).toEqual([]);
    expect(rejected.researchReading).toMatch(/No exact source passage was verified/);

    fetchGutReasoning.mockResolvedValue(modelResult({ researchQuote: 'Participants reported a range of digestive symptoms', researchSourceIds: ['paper:123'] }));
    const accepted = await reasonOverGutEvidence(input);
    expect(accepted.researchSourceIds).toEqual(['paper:123']);
    expect(accepted.researchReading).toContain('Participants reported a range of digestive symptoms');
    expect(accepted.researchReading).not.toContain('proves tea');
  });

  it('changes freshness when onset, context, or confirmed public concept changes', () => {
    const original = gutSynthesisFingerprint(thread, null, '[]', 'caffeine');
    expect(gutSynthesisFingerprint({ ...thread, symptomOnset: { occurredAt: '2026-09-26T08:00:00Z', precision: 'approximate' } }, null, '[]', 'caffeine')).not.toBe(original);
    expect(gutSynthesisFingerprint(thread, null, '[context]', 'caffeine')).not.toBe(original);
    expect(gutSynthesisFingerprint({ ...thread, researchConcept: 'coffee' }, null, '[]', 'caffeine')).not.toBe(original);
  });
});
