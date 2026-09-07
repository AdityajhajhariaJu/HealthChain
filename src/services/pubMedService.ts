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

export function cleanMedicalText(text: string): string {
  if (!text) return '';
  let cleaned = String(text);

  // Multi-pass entity decoding (up to 3 iterations for double/triple encoded strings like &amp;lt;b&amp;gt;)
  for (let pass = 0; pass < 3; pass++) {
    const prev = cleaned;
    cleaned = cleaned
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&nbsp;/g, ' ');
    if (cleaned === prev) break;
  }

  // Strip any remaining HTML/XML tags (<...>)
  cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, '');

  // Strip residual escaped tag-like leftovers (&lt;...&gt;)
  cleaned = cleaned.replace(/&lt;[^&]*&gt;/gi, '');

  // Normalize strange punctuation combinations from raw PubMed/EuropePMC titles
  cleaned = cleaned
    .replace(/\s*:\s*\./g, '.')
    .replace(/\s*;\s*\./g, '.')
    .replace(/\s*:\s*;/g, ':')
    .replace(/\s*;\s*;/g, ';')
    .replace(/\s+([,;:?.!])/g, '$1')
    .replace(/([,;:?.!])\1+/g, '$1');

  // Fix awkward space before colon/semicolon (e.g. "pain : A study" -> "pain: A study")
  cleaned = cleaned.replace(/\s+:/g, ':');

  // Collapse multiple whitespace and trim
  return cleaned.replace(/\s+/g, ' ').trim();
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
        paper.bookOrReportDetails?.publisher;
      const cleanedJournal = rawJournal ? cleanMedicalText(rawJournal) : '';
      const journal = (!cleanedJournal || cleanedJournal.toLowerCase() === 'unknown journal')
        ? 'Peer-Reviewed Clinical Journal'
        : cleanedJournal;
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
