import type { GutResearchPaper, GutResearchTopic } from './GutResearchService';
import type { GutQuestionThread } from './GutResolutionService';

export interface GutBridgePlank {
  field: 'population' | 'exposure' | 'comparison' | 'outcome' | 'setting';
  state: 'source_cue' | 'unknown';
  sourceText: string;
  personalQuestion: string;
  explanation: string;
}

/** Metadata-only bridge. It deliberately does not extract findings from an unreviewed abstract. */
export function buildGutStudyBridge(paper: GutResearchPaper, thread: GutQuestionThread, topic: GutResearchTopic): GutBridgePlank[] {
  const topicLabel: Record<GutResearchTopic, string> = { food: 'food or diet', caffeine: 'caffeine, coffee or tea', dairy: 'milk or dairy', meal_timing: 'meal timing' };
  return [
    { field: 'population', state: paper.titlePopulationCue ? 'source_cue' : 'unknown', sourceText: paper.titlePopulationCue || 'Not verified from index metadata', personalQuestion: 'Your diagnosis and study population have not been matched', explanation: paper.titlePopulationCue ? 'The title names this group; eligibility and diagnosis require the original methods.' : 'Do not infer population from the topic or the person’s symptoms.' },
    { field: 'exposure', state: 'source_cue', sourceText: `Title-matched topic: ${topicLabel[topic]}`, personalQuestion: thread.focus || 'No specific meal or exposure chosen', explanation: 'A title topic is not a verified intervention, dose or preparation.' },
    { field: 'comparison', state: 'unknown', sourceText: 'Not verified from index metadata', personalQuestion: thread.intent === 'decide' ? thread.decision?.options.a.label && thread.decision?.options.b.label ? `${thread.decision.options.a.label} versus ${thread.decision.options.b.label}` : 'Choice options not completed' : 'No comparison selected', explanation: 'Open the original methods before treating a comparator as known.' },
    { field: 'outcome', state: 'unknown', sourceText: 'Measured outcome not verified', personalQuestion: thread.symptom === 'unspecified' ? 'Symptom not selected' : thread.symptom.replace('_', ' '), explanation: 'A symptom in the title does not verify how or when the study measured it.' },
    { field: 'setting', state: 'unknown', sourceText: 'Study setting not verified', personalQuestion: 'Your everyday setting', explanation: 'Study design and setting need review in the original paper.' },
  ];
}
