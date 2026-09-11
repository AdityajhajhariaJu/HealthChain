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
  retrievedAt?: string;
  sourceName?: string;
}

const fetchWithTimeout = async (url: string, options: any = {}, timeoutMs = 12000) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('OFFLINE: Device is currently disconnected from network');
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('TIMEOUT: Literature query timed out');
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

function parsePapersFromResults(resultList: any[], retrievedAt: string): LiteraturePaper[] {
  return resultList.map((paper: any) => {
    const id = paper.pmid || paper.id || 'N/A';
    const title = cleanMedicalText(paper.title) || 'Untitled Paper';
    const rawJournal = paper.journalTitle ||
      paper.journalInfo?.journal?.title ||
      paper.journalInfo?.journal?.medlineAbbreviation ||
      paper.bookOrReportDetails?.publisher;
    const cleanedJournal = rawJournal ? cleanMedicalText(rawJournal) : '';
    const journal = (!cleanedJournal || cleanedJournal.toLowerCase() === 'unknown journal')
      ? 'Peer-Reviewed Clinical Journal'
      : cleanedJournal;
    const pubYear = String(paper.pubYear || new Date().getFullYear());
    const abstract = cleanMedicalText(paper.abstractText) || 'No abstract available.';
    const authors = cleanMedicalText(paper.authorString) || 'Clinical Investigators';
    const url = id && id !== 'N/A'
      ? `https://europepmc.org/article/MED/${id}`
      : `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(title)}`;

    return {
      id,
      title,
      journal,
      pubYear,
      abstract,
      authors,
      url,
      retrievedAt,
      sourceName: 'Europe PMC / PubMed',
    };
  });
}

/**
 * Fetch recent medical literature using the Europe PMC API (which mirrors PubMed but offers a cleaner JSON API).
 */
export async function fetchRecentLiterature(conditions: string[]): Promise<LiteraturePaper[]> {
  if (!conditions || conditions.length === 0) return [];

  const sanitizedConditions = conditions
    .map(c => String(c || '').replace(/["\\]/g, '').replace(/[+\-&|!(){}[\]^~*?:/]/g, ' ').trim())
    .filter(c => c.length > 1);

  if (sanitizedConditions.length === 0) return [];

  const primaryCondition = sanitizedConditions[0];
  const currentYear = new Date().getFullYear();
  const recentStartYear = currentYear - 3;
  const retrievedAt = new Date().toISOString();

  const query = `"${primaryCondition}" AND (SRC:MED) AND HAS_ABSTRACT:y AND PUB_YEAR:[${recentStartYear} TO ${currentYear}]`;
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(
    query
  )}&format=json&resultType=core&pageSize=6`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`Europe PMC API responded with ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    let resultList = Array.isArray(data?.resultList?.result) ? data.resultList.result : [];

    // If recent window returned 0 results, retry with wider 10-year window
    if (resultList.length === 0) {
      const expandedStartYear = currentYear - 10;
      const widerQuery = `"${primaryCondition}" AND (SRC:MED) AND HAS_ABSTRACT:y AND PUB_YEAR:[${expandedStartYear} TO ${currentYear}]`;
      const widerUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(
        widerQuery
      )}&format=json&resultType=core&pageSize=6`;

      try {
        const widerRes = await fetchWithTimeout(widerUrl);
        if (widerRes.ok) {
          const widerData = await widerRes.json();
          if (Array.isArray(widerData?.resultList?.result) && widerData.resultList.result.length > 0) {
            resultList = widerData.resultList.result;
          }
        }
      } catch {}
    }

    // Secondary fallback: If still 0 and secondary condition exists, query secondary
    if (resultList.length === 0 && sanitizedConditions.length > 1) {
      const secondaryQuery = `"${sanitizedConditions[1]}" AND (SRC:MED) AND HAS_ABSTRACT:y`;
      const secUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(
        secondaryQuery
      )}&format=json&resultType=core&pageSize=6`;
      try {
        const secRes = await fetchWithTimeout(secUrl);
        if (secRes.ok) {
          const secData = await secRes.json();
          if (Array.isArray(secData?.resultList?.result) && secData.resultList.result.length > 0) {
            resultList = secData.resultList.result;
          }
        }
      } catch {}
    }

    return parsePapersFromResults(resultList, retrievedAt);
  } catch (error) {
    console.error('Error fetching literature:', error);
    throw error;
  }
}
