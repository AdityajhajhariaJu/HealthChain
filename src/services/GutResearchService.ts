import { cleanMedicalText } from './pubMedService';
import type { GutSymptom } from './GutResolutionService';

export type GutResearchTopic = 'food' | 'caffeine' | 'dairy' | 'meal_timing';

/** General education links are deliberately separate from personal evidence and paper search. */
export const gutContentVersion = '2026-09-26.1';
export const gutGeneralGuidance: Partial<Record<GutSymptom, { title: string; url: string; sourceOrganization: string; reviewStatus: 'pending_independent_review'; contentVersion: string }>> = {
  bloating: { title: 'NIDDK: Gas and bloating', url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/gas-digestive-tract/symptoms-causes', sourceOrganization: 'NIDDK', reviewStatus: 'pending_independent_review', contentVersion: gutContentVersion },
  discomfort: { title: 'NIDDK: Indigestion symptoms', url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/indigestion-dyspepsia/symptoms-causes', sourceOrganization: 'NIDDK', reviewStatus: 'pending_independent_review', contentVersion: gutContentVersion },
  reflux: { title: 'NIDDK: Reflux symptoms', url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/acid-reflux-ger-gerd-adults/symptoms-causes', sourceOrganization: 'NIDDK', reviewStatus: 'pending_independent_review', contentVersion: gutContentVersion },
  nausea: { title: 'NIDDK: Indigestion symptoms', url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/indigestion-dyspepsia/symptoms-causes', sourceOrganization: 'NIDDK', reviewStatus: 'pending_independent_review', contentVersion: gutContentVersion },
  bowel_changes: { title: 'NIDDK: Digestive diseases', url: 'https://www.niddk.nih.gov/health-information/digestive-diseases', sourceOrganization: 'NIDDK', reviewStatus: 'pending_independent_review', contentVersion: gutContentVersion },
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

export interface GutPublicationStatus {
  id: string;
  title: string;
  correctionNotice: string | null;
  publicationDate: string | null;
  status: 'active' | 'corrected' | 'retracted' | 'unavailable';
}

export interface GutResearchBriefSource {
  id: string;
  title: string;
  url: string;
  status: string;
  correctionNotice: string | null;
}

/** Citation-only export. Saved/search-discovered papers are not represented as reviewed findings. */
export function formatGutResearchBrief(sources: GutResearchBriefSource[]): string[] {
  if (sources.length === 0) return ['General research source: none attached to this brief.'];
  return [
    'General research source records (citation discovery only; not an independently reviewed synthesis or personal explanation):',
    ...sources.map((source) => `${source.title} — PMID ${source.id} — ${source.url}; saved publication status: ${source.status}${source.correctionNotice ? `; notice: ${source.correctionNotice}` : ''}`),
  ];
}

const RESEARCH_CACHE_TTL_MS = 15 * 60 * 1000;
const RESEARCH_CACHE_MAX = 16;
const researchCache = new Map<string, { savedAt: number; papers: GutResearchPaper[] }>();

/** Search terms contain only generic topic IDs; this in-memory cache is never profile scoped. */
export function clearGutResearchCache(): void {
  researchCache.clear();
}

/** Refresh an exact saved PMID; a changing search rank must not erase a reviewed source. */
export async function getGutPublicationStatus(id: string, signal?: AbortSignal): Promise<GutPublicationStatus> {
  if (!/^\d+$/.test(id)) throw new Error('Invalid publication ID');
  const response = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/article/MED/${encodeURIComponent(id)}?format=json&resultType=core`, { signal });
  if (response.status === 404) return { id, title: '', correctionNotice: null, publicationDate: null, status: 'unavailable' };
  if (!response.ok) throw new Error('Research service unavailable');
  const data = await response.json();
  const paper = data?.result || data;
  const raw = paper?.commentCorrectionList?.commentCorrection;
  const notices = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const types: string[] = notices.map((item: { type?: string }) => cleanMedicalText(String(item?.type || '')));
  const retracted = paper?.isRetracted === 'Y' || paper?.isRetracted === true || types.some((type) => /^(retracted in|retraction of)$/i.test(type));
  const correctionNotice = types.find((type) => /erratum|correction|expression of concern|retract/i.test(type)) || null;
  return { id, title: cleanMedicalText(String(paper?.title || '')), correctionNotice, publicationDate: explicitDate(paper?.electronicPublicationDate) || explicitDate(paper?.printPublicationDate), status: retracted ? 'retracted' : correctionNotice ? 'corrected' : 'active' };
}

export function compareGutPublicationStatus(previous: GutPublicationStatus[], current: GutPublicationStatus[]) {
  const oldById = new Map(previous.map((item) => [item.id, item]));
  return current.flatMap((item) => {
    const old = oldById.get(item.id);
    if (!old) return [];
    const changes: string[] = [];
    if (old.status !== item.status) changes.push(`publication status: ${old.status} → ${item.status}`);
    if (old.correctionNotice !== item.correctionNotice) changes.push('publication notice changed');
    if (old.title && item.title && old.title !== item.title) changes.push('indexed title changed');
    if (old.publicationDate !== item.publicationDate) changes.push('indexed publication date changed');
    return changes.length ? [{ id: item.id, title: item.title || old.title, changes }] : [];
  });
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
  food: { label: 'Food in general', query: 'TITLE_ABS:diet OR TITLE_ABS:meal OR TITLE_ABS:food OR TITLE_ABS:nutrition' },
  caffeine: { label: 'Caffeine, coffee or tea', query: 'TITLE_ABS:caffeine OR TITLE_ABS:coffee OR TITLE_ABS:tea' },
  dairy: { label: 'Milk or dairy', query: 'TITLE_ABS:milk OR TITLE_ABS:lactose OR TITLE_ABS:dairy' },
  meal_timing: { label: 'Meal timing', query: 'TITLE_ABS:"meal timing" OR TITLE_ABS:"eating time" OR TITLE_ABS:postprandial' },
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
  const cacheKey = `${symptom}:${topic}`;
  const cached = researchCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < RESEARCH_CACHE_TTL_MS) return cached.papers.map((paper) => ({ ...paper }));
  if (cached) researchCache.delete(cacheKey);
  const params = new URLSearchParams({
    query: `(${concept}) AND (${selectedTopic.query}) AND SRC:MED AND HAS_ABSTRACT:y`,
    format: 'json', resultType: 'core', pageSize: '30',
  });
  const response = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`, { signal });
  if (!response.ok) throw new Error('Research service unavailable');
  const data = await response.json();
  const rows = Array.isArray(data?.resultList?.result) ? data.resultList.result : [];
  const retrievedAt = new Date().toISOString();
  const eligible = rows.filter((paper: any) => {
    const corrections = paper?.commentCorrectionList?.commentCorrection;
    const related = Array.isArray(corrections) ? corrections : corrections ? [corrections] : [];
    const title = String(paper?.title || '');
    const searchableText = `${title} ${String(paper?.abstractText || '')}`;
    // Europe PMC can search both title and abstract. Requiring both concepts in
    // the title silently drops relevant papers whose exposure is in the abstract.
    return /^\d+$/.test(String(paper?.pmid || '')) && symptomTitle[symptom].test(searchableText) && topicTitle[topic].test(searchableText) && !nonHumanTitle.test(title) &&
      paper?.isRetracted !== 'Y' && paper?.isRetracted !== true &&
      !related.some((item: any) => /^(retracted in|retraction of)$/i.test(String(item?.type || '')));
  });
  // A review gets reading priority, not a quality grade. Keep original relevance order within each group.
  const ranked = eligible.map((paper: any, index: number) => ({ paper, index })).sort((a: any, b: any) => {
    const priority = (row: any) => {
      const raw = row?.pubTypeList?.pubType;
      const types = Array.isArray(raw) ? raw : raw ? [raw] : [];
      return types.some((type: string) => /systematic review|meta.analysis/i.test(String(type))) ? 0 : types.some((type: string) => /^review$/i.test(String(type))) ? 1 : 2;
    };
    return priority(a.paper) - priority(b.paper) || a.index - b.index;
  });
  const papers = ranked.filter(({ paper }: { paper: any }) => !!paper?.pmid).filter(({ paper }: { paper: any }, index: number, all: { paper: any }[]) => all.findIndex((entry) => String(entry.paper.pmid) === String(paper.pmid)) === index).slice(0, 8).map(({ paper }: { paper: any }) => {
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
  if (!signal?.aborted) {
    researchCache.set(cacheKey, { savedAt: Date.now(), papers });
    while (researchCache.size > RESEARCH_CACHE_MAX) researchCache.delete(researchCache.keys().next().value!);
  }
  return papers.map((paper) => ({ ...paper }));
}
