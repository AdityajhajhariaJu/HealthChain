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
    clearTimeout(id);
    return response;
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error('Timeout');
    }
    throw err;
  }
};

/**
 * Fetch recent medical literature using the Europe PMC API (which mirrors PubMed but offers a cleaner JSON API).
 */
export async function fetchRecentLiterature(conditions: string[]): Promise<LiteraturePaper[]> {
  if (!conditions || conditions.length === 0) return [];

  // Create a query for the top condition, restricting to recent papers with abstracts
  const primaryCondition = conditions[0];
  const query = `"${primaryCondition}" AND (SRC:MED) AND HAS_ABSTRACT:y AND PUB_YEAR:[2023 TO 2026]`;
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
      const title = paper.title || 'Untitled Paper';
      const journal = paper.journalTitle || paper.bookOrReportDetails?.publisher || 'Unknown Journal';
      const pubYear = paper.pubYear || 'Unknown Year';
      const abstract = paper.abstractText || 'No abstract available.';
      const authors = paper.authorString || 'Unknown Authors';
      const url = `https://europepmc.org/article/MED/${id}`;

      // Clean HTML tags from abstract if any
      const cleanAbstract = abstract.replace(/<\/?[^>]+(>|$)/g, "");

      return {
        id,
        title,
        journal,
        pubYear,
        abstract: cleanAbstract,
        authors,
        url,
      };
    });
  } catch (error) {
    console.error('Error fetching literature:', error);
    return [];
  }
}
