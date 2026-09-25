import { cleanMedicalText } from './pubMedService';
import type { GutSymptom } from './GutResolutionService';

export type GutResearchTopic = 'food' | 'caffeine' | 'dairy' | 'meal_timing';

/** General education links are deliberately separate from personal evidence and paper search. */
export const gutGeneralGuidance: Partial<Record<GutSymptom, { title: string; summary: string; url: string }>> = {
  bloating: { title: 'NIDDK: Gas and bloating', summary: 'Bloating has several possible explanations, including swallowed air, digestion of carbohydrates and digestive conditions. A meal name or timing alone cannot identify yours.', url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/gas-digestive-tract/symptoms-causes' },
  discomfort: { title: 'NIDDK: Indigestion symptoms', summary: 'Upper abdominal discomfort can accompany fullness, bloating or nausea. This overview does not determine whether your discomfort is indigestion.', url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/indigestion-dyspepsia/symptoms-causes' },
  reflux: { title: 'NIDDK: Reflux symptoms', summary: 'This overview describes common reflux symptoms and when to discuss them with a clinician. Your records cannot diagnose reflux disease.', url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/acid-reflux-ger-gerd-adults/symptoms-causes' },
  nausea: { title: 'NIDDK: Indigestion symptoms', summary: 'Nausea can occur alongside indigestion symptoms, but it has many possible explanations. This page is general context, not a match to your cause.', url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/indigestion-dyspepsia/symptoms-causes' },
  bowel_changes: { title: 'NIDDK: Digestive diseases', summary: 'Bowel changes can involve different concerns, including diarrhea, constipation and bowel control. This index links to separate overviews; choose one that matches your experience. The app has not classified your bowel change.', url: 'https://www.niddk.nih.gov/health-information/digestive-diseases' },
};

export interface GutResearchPaper {
  id: string;
  title: string;
  journal: string | null;
  year: string | null;
  publicationDate: string | null;
  publicationDateSource: 'electronic' | 'print' | null;
  abstract: string | null;
  url: string;
  retrievedAt: string;
  populationKnown: boolean;
  publicationTypes: string[];
  correctionNotice: string | null;
  titlePopulationCue: string | null;
}

const concepts: Record<GutSymptom, string> = {
  unspecified: '',
  bloating: '"abdominal bloating"',
  discomfort: '"abdominal pain"',
  reflux: '"gastroesophageal reflux"',
  nausea: 'nausea',
  bowel_changes: '"bowel habits" OR constipation OR diarrhea',
};
export const gutResearchTopics: Record<GutResearchTopic, { label: string; query: string }> = {
  food: { label: 'Food in general', query: 'TITLE:diet OR TITLE:meal OR TITLE:food OR TITLE:nutrition' },
  caffeine: { label: 'Caffeine, coffee or tea', query: 'TITLE:caffeine OR TITLE:coffee OR TITLE:tea' },
  dairy: { label: 'Milk or dairy', query: 'TITLE:milk OR TITLE:lactose OR TITLE:dairy' },
  meal_timing: { label: 'Meal timing', query: 'TITLE:"meal timing" OR TITLE:"eating time" OR TITLE:postprandial' },
};
const nonHumanTitle = /\b(?:mice|mouse|rats?|broilers?|chickens?|porcine|in vitro|cell lines?)\b/i;
const symptomTitle: Record<GutSymptom, RegExp> = {
  unspecified: /$^/,
  bloating: /bloat|distension/i, discomfort: /abdomin|pain|dyspep/i,
  reflux: /reflux|gastroesophag|GERD/i, nausea: /nausea|vomit/i,
  bowel_changes: /bowel|constipat|diarrh|stool/i,
};
const topicTitle: Record<GutResearchTopic, RegExp> = {
  food: /\b(?:diet|meal|food|nutrition)\b/i,
  caffeine: /\b(?:caffeine|coffee|tea)\b/i,
  dairy: /\b(?:milk|lactose|dairy)\b/i,
  meal_timing: /\b(?:meal timing|eating time|postprandial)\b/i,
};
const titlePopulationCue = (title: string): string | null => {
  if (/\b(?:infants?|newborns?)\b/i.test(title)) return 'infants';
  if (/\b(?:children|child|pediatric|paediatric|adolescents?|teenagers?)\b/i.test(title)) return 'children or adolescents';
  if (/\b(?:pregnant|pregnancy)\b/i.test(title)) return 'pregnancy';
  if (/\b(?:older adults?|elderly)\b/i.test(title)) return 'older adults';
  if (/\badults?\b/i.test(title)) return 'adults';
  return null;
};
const explicitDate = (value: unknown): string | null => {
  const date = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
};

/** A generic concept query: no personal question, account ID, timeline or meal name leaves the device. */
export async function searchGutResearch(symptom: GutSymptom, topic: GutResearchTopic = 'food', signal?: AbortSignal): Promise<GutResearchPaper[]> {
  const concept = concepts[symptom];
  const selectedTopic = gutResearchTopics[topic];
  if (!concept || !selectedTopic) return [];
  const params = new URLSearchParams({
    query: `(${concept}) AND (${selectedTopic.query}) AND SRC:MED AND HAS_ABSTRACT:y`,
    format: 'json', resultType: 'core', pageSize: '30',
  });
  const response = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`, { signal });
  if (!response.ok) throw new Error('Research service unavailable');
  const data = await response.json();
  const rows = Array.isArray(data?.resultList?.result) ? data.resultList.result : [];
  const retrievedAt = new Date().toISOString();
  return rows.filter((paper: any) => {
    const corrections = paper?.commentCorrectionList?.commentCorrection;
    const related = Array.isArray(corrections) ? corrections : corrections ? [corrections] : [];
    const title = String(paper?.title || '');
    return /^\d+$/.test(String(paper?.pmid || '')) && symptomTitle[symptom].test(title) && topicTitle[topic].test(title) && !nonHumanTitle.test(title) &&
      paper?.isRetracted !== 'Y' && paper?.isRetracted !== true &&
      !related.some((item: any) => /^(retracted in|retraction of)$/i.test(String(item?.type || '')));
  }).slice(0, 4).map((paper: any) => {
    const abstract = cleanMedicalText(paper.abstractText || '');
    const year = /^\d{4}$/.test(String(paper.pubYear || '')) ? String(paper.pubYear) : null;
    const types = paper.pubTypeList?.pubType;
    const publicationTypes = (Array.isArray(types) ? types : types ? [types] : []).map((item: unknown) => cleanMedicalText(String(item))).filter(Boolean).slice(0, 3);
    const corrections = paper.commentCorrectionList?.commentCorrection;
    const related = Array.isArray(corrections) ? corrections : corrections ? [corrections] : [];
    const notice = related.map((item: any) => cleanMedicalText(String(item?.type || ''))).find((type: string) => /erratum|correction|expression of concern/i.test(type));
    const electronicDate = explicitDate(paper.electronicPublicationDate);
    const printDate = explicitDate(paper.printPublicationDate);
    return {
      id: String(paper.pmid),
      title: cleanMedicalText(paper.title || '') || 'Title unavailable',
      journal: cleanMedicalText(paper.journalInfo?.journal?.title || paper.journalTitle || '') || null,
      year,
      publicationDate: electronicDate || printDate,
      publicationDateSource: electronicDate ? 'electronic' as const : printDate ? 'print' as const : null,
      abstract: abstract || null,
      url: `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(String(paper.pmid))}/`,
      retrievedAt,
      populationKnown: false,
      publicationTypes,
      correctionNotice: notice || null,
      titlePopulationCue: titlePopulationCue(String(paper.title || '')),
    };
  });
}
