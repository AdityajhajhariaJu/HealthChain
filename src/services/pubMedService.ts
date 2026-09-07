export interface LiteraturePaper {
  id: string; // PMID or PMCID
  title: string;
  journal: string;
  pubYear: string;
  abstract: string;
  authors: string;
  url: string;
  matchScore?: number;
  aiContext?: string;
}

const fetchWithTimeout = async (url: string, options: any = {}, timeoutMs = 30000) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Offline');
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Timeout');
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
};

function cleanMedicalText(text: string): string {
  if (!text) return '';
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch recent medical literature using the Europe PMC API (which mirrors PubMed but offers a cleaner JSON API).
 */
export async function fetchRecentLiterature(conditions: string[]): Promise<LiteraturePaper[]> {
  if (!conditions || conditions.length === 0) return [];

  const rawCondition = conditions[0] || '';
  const sanitizedCondition = rawCondition.replace(/["\\]/g, '').replace(/[+\-&|!(){}[\]^~*?:/]/g, ' ').trim();
  if (!sanitizedCondition) return [];
  const query = `"${sanitizedCondition}" AND (SRC:MED) AND HAS_ABSTRACT:y AND PUB_YEAR:[2023 TO 2026]`;
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(
    query
  )}&format=json&resultType=core&pageSize=5`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch literature: ${response.statusText}`);
    }

    const data = await response.json();
    const resultList = data.resultList?.result || [];

    return resultList.map((paper: any) => {

      const id = paper.pmid || paper.id;
      const title = cleanMedicalText(paper.title) || 'Untitled Paper';
      const rawJournal = paper.journalTitle ||
        paper.journalInfo?.journal?.title ||
        paper.journalInfo?.journal?.medlineAbbreviation ||
        paper.bookOrReportDetails?.publisher ||
        'Peer-Reviewed Clinical Journal';
      const journal = cleanMedicalText(rawJournal) || 'Peer-Reviewed Clinical Journal';
      const pubYear = paper.pubYear || '2025';
      const abstract = cleanMedicalText(paper.abstractText) || 'No abstract available.';
      const authors = cleanMedicalText(paper.authorString) || 'Clinical Investigators';
      const url = `https://europepmc.org/article/MED/${id}`;

      return {
        id,
        title,
        journal,
        pubYear,
        abstract,
        authors,
        url,
      };
    });
  } catch (error) {
    console.error('Error fetching literature:', error);
    return [];
  }
}
