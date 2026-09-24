import { cleanMedicalText } from './pubMedService';
import type { GutSymptom } from './GutResolutionService';

export interface GutResearchPaper {
  id: string;
  title: string;
  journal: string | null;
  year: string | null;
  abstract: string | null;
  url: string;
  retrievedAt: string;
  populationKnown: boolean;
}

const concepts: Record<GutSymptom, string> = {
  bloating: '"abdominal bloating" AND (diet OR meal OR food)',
  discomfort: '"abdominal pain" AND (diet OR meal OR food)',
  reflux: '"gastroesophageal reflux" AND (diet OR meal OR food)',
  nausea: 'nausea AND (diet OR meal OR food)',
  bowel_changes: '"bowel habits" AND (diet OR meal OR food)',
};

/** A generic concept query: no personal question, account ID, timeline or meal name leaves the device. */
export async function searchGutResearch(symptom: GutSymptom, signal?: AbortSignal): Promise<GutResearchPaper[]> {
  const concept = concepts[symptom];
  if (!concept) return [];
  const params = new URLSearchParams({
    query: `(${concept}) AND SRC:MED AND HAS_ABSTRACT:y`,
    format: 'json', resultType: 'core', pageSize: '6',
  });
  const response = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`, { signal });
  if (!response.ok) throw new Error('Research service unavailable');
  const data = await response.json();
  const rows = Array.isArray(data?.resultList?.result) ? data.resultList.result : [];
  const retrievedAt = new Date().toISOString();
  return rows.filter((paper: any) => paper?.pmid && paper?.isRetracted !== 'Y').slice(0, 4).map((paper: any) => {
    const abstract = cleanMedicalText(paper.abstractText || '');
    const year = /^\d{4}$/.test(String(paper.pubYear || '')) ? String(paper.pubYear) : null;
    return {
      id: String(paper.pmid),
      title: cleanMedicalText(paper.title || '') || 'Title unavailable',
      journal: cleanMedicalText(paper.journalTitle || '') || null,
      year,
      abstract: abstract || null,
      url: `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(String(paper.pmid))}/`,
      retrievedAt,
      populationKnown: false,
    };
  });
}
