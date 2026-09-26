import { fetchGutQuestionFrame } from './geminiService';
import { parseModelJson } from './modelJson';
import type { GutSymptom } from './GutResolutionService';
import type { GutResearchTopic } from './GutResearchService';

export interface GutQuestionFrame {
  proposedSymptom: GutSymptom;
  proposedMealPhrase: string;
  researchTopic: GutResearchTopic;
  researchConcept: string;
  oneClarification: string;
}

const symptoms: GutSymptom[] = ['unspecified', 'bloating', 'discomfort', 'reflux', 'nausea', 'bowel_changes'];
const topics: GutResearchTopic[] = ['food', 'caffeine', 'dairy', 'meal_timing'];
const plain = (value: unknown, max: number) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/** Gemini proposes only; the user must confirm any personal comparison. */
export async function frameGutQuestion(question: string, savedMealNames: string[]): Promise<GutQuestionFrame> {
  const shortQuestion = plain(question, 500);
  const names = savedMealNames.map((name) => plain(name, 120)).filter(Boolean).slice(0, 20);
  const raw = await fetchGutQuestionFrame({ question: shortQuestion, savedMealNames: names });
  const value = parseModelJson<Record<string, unknown>>(raw, null);
  if (!value) throw new Error('Question framing was unreadable. You can continue using your own words.');
  const proposedSymptom = symptoms.includes(value.proposedSymptom as GutSymptom) ? value.proposedSymptom as GutSymptom : 'unspecified';
  const researchTopic = topics.includes(value.researchTopic as GutResearchTopic) ? value.researchTopic as GutResearchTopic : 'food';
  const phrase = plain(value.proposedMealPhrase, 120);
  const questionLower = shortQuestion.toLocaleLowerCase();
  const proposedMealPhrase = phrase && (questionLower.includes(phrase.toLocaleLowerCase()) || names.some((name) => name.toLocaleLowerCase() === phrase.toLocaleLowerCase())) ? phrase : '';
  const clarification = plain(value.oneClarification, 160);
  const concept = plain(value.researchConcept, 60);
  // Only a short public concept may leave the device for literature search.
  // It is shown for confirmation before being stored with the question.
  const researchConcept = /^[\p{L}][\p{L} -]{1,59}$/u.test(concept) && concept.split(/\s+/).length <= 4
    && !/\b(?:my|mine|our|today|yesterday|patient|doctor|dr|mr|mrs)\b/i.test(concept)
    ? concept : '';
  return {
    proposedSymptom,
    proposedMealPhrase,
    researchTopic,
    researchConcept,
    oneClarification: /\b(?:diagnos|prescrib|avoid|eliminat|take medicine|ignore instructions)\b/i.test(clarification) ? '' : clarification,
  };
}
