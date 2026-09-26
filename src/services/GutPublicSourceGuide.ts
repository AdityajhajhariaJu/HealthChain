import type { GutSymptom } from './GutResolutionService';
import type { GutResearchTopic } from './GutResearchService';

/** Short source-navigation notes. These are not independently approved HealthChain clinical findings. */
export interface GutPublicSourceGuide {
  title: string;
  sentence: string;
  relevance: string;
  limit: string;
  url: string;
  locator: string;
  sourceReviewed: string;
}

const guides: Partial<Record<GutSymptom, GutPublicSourceGuide>> = {
  bloating: {
    title: 'Why bloating has more than one possible explanation',
    sentence: 'NIDDK describes swallowed air, breakdown of carbohydrates, and several digestive conditions among possible contexts for gas and bloating.',
    relevance: 'A meal diary can show what you reported together. It cannot distinguish those explanations by itself.',
    limit: 'This source does not evaluate your meal, identify your cause, or recommend a food restriction.',
    url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/gas-digestive-tract/symptoms-causes',
    locator: 'Symptoms & Causes of Gas in the Digestive Tract — What causes gas? / What health conditions can cause problems with gas symptoms?',
    sourceReviewed: 'June 2021',
  },
  discomfort: {
    title: 'What general information can say about abdominal discomfort',
    sentence: 'NIDDK lists upper-abdominal pain or discomfort, early fullness, bloating and nausea as symptoms that can occur with indigestion.',
    relevance: 'A symptom description and its timing can help a clinician evaluate what is happening.',
    limit: 'Pain elsewhere or pain after a meal is not automatically indigestion. This page cannot diagnose your pain or link it to lunch.',
    url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/indigestion-dyspepsia/symptoms-causes',
    locator: 'Symptoms & Causes of Indigestion — What are the symptoms of indigestion?',
    sourceReviewed: 'NIDDK page; check original for current review date',
  },
  reflux: {
    title: 'What reflux symptoms can look like',
    sentence: 'NIDDK describes heartburn and regurgitation as common reflux symptoms and notes that symptoms can vary.',
    relevance: 'A clear description of what you felt is more useful than assuming every burning sensation has the same cause.',
    limit: 'This source does not establish that your symptom is reflux or identify a personal food trigger.',
    url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/acid-reflux-ger-gerd-adults/symptoms-causes',
    locator: 'Symptoms & Causes of GER & GERD — What are the symptoms?',
    sourceReviewed: 'NIDDK page; check original for current review date',
  },
  nausea: {
    title: 'Nausea can accompany different digestive concerns',
    sentence: 'NIDDK lists nausea among symptoms that can occur with indigestion, alongside upper-abdominal discomfort, fullness and bloating.',
    relevance: 'Recording what happened and when can make a care conversation clearer.',
    limit: 'This is not a nausea diagnosis or a list of all possible causes.',
    url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/indigestion-dyspepsia/symptoms-causes',
    locator: 'Symptoms & Causes of Indigestion — What are the symptoms of indigestion?',
    sourceReviewed: 'NIDDK page; check original for current review date',
  },
  bowel_changes: {
    title: 'Bowel changes need their own context',
    sentence: 'NIDDK explains that clinicians assess abdominal pain together with bowel-movement patterns and medical history when evaluating IBS.',
    relevance: 'Your dated reports can help describe a pattern without assigning a diagnosis.',
    limit: 'This source does not mean your bowel change is IBS; other concerns may require evaluation.',
    url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/irritable-bowel-syndrome/diagnosis',
    locator: 'Diagnosis of Irritable Bowel Syndrome — How do doctors diagnose IBS?',
    sourceReviewed: 'November 2017',
  },
};

export function getGutPublicSourceGuide(symptom: GutSymptom): GutPublicSourceGuide | null {
  return guides[symptom] || null;
}

export interface GutTopicSourceGuide {
  title: string;
  sourceSays: string;
  population: string;
  fit: string;
  url: string;
  locator: string;
}

/** Specific source notes are shown only where the named topic is actually covered. */
export function getGutTopicSourceGuide(symptom: GutSymptom, topic: GutResearchTopic | null): GutTopicSourceGuide | null {
  if (topic === 'caffeine' && (symptom === 'bloating' || symptom === 'bowel_changes')) return {
    title: 'Caffeine: the question is narrower than the headline',
    sourceSays: 'Monash University notes that much of the cited caffeine-and-IBS evidence is observational or based on open challenges, so it does not establish cause and effect.',
    population: 'People with IBS; several cited outcomes concern diarrhea rather than bloating.',
    fit: 'This may help frame a question about caffeine. It cannot tell whether your particular chai, recipe, or symptom has the same explanation.',
    url: 'https://www.monashfodmap.com/blog/does-caffeine-affect-ibs-symptoms/',
    locator: 'Does caffeine affect IBS symptoms? — discussion of observational studies and open challenges',
  };
  if (topic === 'dairy' && (symptom === 'bloating' || symptom === 'discomfort' || symptom === 'bowel_changes' || symptom === 'nausea')) return {
    title: 'Dairy: lactose is one possible question, not a verdict',
    sourceSays: 'NIDDK lists bloating, abdominal pain, nausea and diarrhea among symptoms that may occur with lactose intolerance after lactose-containing foods.',
    population: 'People with lactose intolerance; the page does not identify who has it from a diary.',
    fit: 'A meal name does not prove lactose content, intolerance, or that dairy explains your report. Inspect the exact food and discuss persistent concerns with a clinician.',
    url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/lactose-intolerance/symptoms-causes',
    locator: 'Symptoms & Causes of Lactose Intolerance — What are the symptoms?',
  };
  return null;
}
