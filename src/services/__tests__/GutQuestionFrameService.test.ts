import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchGutQuestionFrame } = vi.hoisted(() => ({ fetchGutQuestionFrame: vi.fn() }));
vi.mock('../geminiService', () => ({ fetchGutQuestionFrame }));

import { frameGutQuestion } from '../GutQuestionFrameService';

describe('Gut question framing', () => {
  beforeEach(() => fetchGutQuestionFrame.mockReset());

  it('keeps the model proposals tentative and limited to a confirmed question or saved meal', async () => {
    fetchGutQuestionFrame.mockResolvedValue(JSON.stringify({ proposedSymptom: 'bloating', proposedMealPhrase: 'chai', researchTopic: 'caffeine', researchConcept: 'tea', oneClarification: '' }));
    const frame = await frameGutQuestion('Is chai linked to my bloating?', ['Masala Chai']);
    expect(frame).toEqual({ proposedSymptom: 'bloating', proposedMealPhrase: 'chai', researchTopic: 'caffeine', researchConcept: 'tea', oneClarification: '' });
    expect(fetchGutQuestionFrame).toHaveBeenCalledWith({ question: 'Is chai linked to my bloating?', savedMealNames: ['Masala Chai'] });
  });

  it('drops invented meal matches and private or directive-like public query terms', async () => {
    fetchGutQuestionFrame.mockResolvedValue(JSON.stringify({ proposedSymptom: 'diagnosis', proposedMealPhrase: 'invented meal', researchTopic: 'unknown', researchConcept: 'Dr Smith', oneClarification: 'Avoid all food now' }));
    const frame = await frameGutQuestion('I feel bloated', ['Masala Chai']);
    expect(frame).toEqual({ proposedSymptom: 'unspecified', proposedMealPhrase: '', researchTopic: 'food', researchConcept: '', oneClarification: '' });
  });
});
