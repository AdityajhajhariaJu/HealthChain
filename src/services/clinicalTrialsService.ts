export interface ClinicalTrial {
  id: string;
  title: string;
  phase: string;
  status: string;
  location: string;
  summary: string;
  conditions: string[];
  interventions: string[];
  matchScore?: number;
  eligibility?: {
    minimumAge?: string;
    maximumAge?: string;
    sex?: string;
    eligibilityCriteria?: string;
    healthyVolunteers?: boolean | string;
    [key: string]: any;
  };
  url?: string;
  aiContext?: string;
  retrievedAt?: string;
  sourceName?: string;
  protocolSection?: any;
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
      throw new Error('TIMEOUT: ClinicalTrials.gov query timed out');
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
};

const BACKEND_BASE = ((import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/+$/, '')) || (import.meta.env.DEV ? 'http://localhost:3000' : '');

function mapStudiesFromRaw(studies: any[]): ClinicalTrial[] {
  const retrievedAt = new Date().toISOString();
  return (studies || []).map((study: any) => {
    // Some studies may be already mapped (e.g. from backend proxy)
    const protocol = study?.protocolSection || study?.rawProtocol || study;
    const ident = protocol?.identificationModule || {};
    const statusMod = protocol?.statusModule || {};
    const design = protocol?.designModule || {};
    const desc = protocol?.descriptionModule || {};
    const condMod = protocol?.conditionsModule || {};
    const arms = protocol?.armsInterventionsModule || {};
    const locs = protocol?.contactsLocationsModule?.locations || [];

    const id = ident.nctId || study?.id || 'Unknown NCT';
    const title = ident.briefTitle || study?.title || 'Untitled Study';
    const status = statusMod.overallStatus || study?.status || 'Unknown';
    const phase = Array.isArray(design.phases) ? design.phases.join(', ') : (study?.phase || 'Phase Unknown');
    const summary = desc.briefSummary || study?.summary || 'No summary provided.';
    const conds = Array.isArray(condMod.conditions) ? condMod.conditions : (study?.conditions || []);
    
    const interventionsList = Array.isArray(arms.interventions) ? arms.interventions : (study?.interventions || []);
    const interventions = interventionsList.map((i: any) => typeof i === 'string' ? i : i?.name).filter(Boolean);

    let locationStr = study?.location || 'Multiple Locations / Global';
    if (locs.length > 0) {
      const firstLoc = locs[0];
      locationStr = `${firstLoc.facility || 'Clinical Facility'}, ${firstLoc.city || ''}, ${firstLoc.country || ''}`.replace(/,\s*,/g, ',');
    }

    return {
      id,
      title,
      phase,
      status,
      location: locationStr,
      summary,
      conditions: conds,
      interventions,
      eligibility: protocol?.eligibilityModule || study?.eligibility || undefined,
      url: study?.url || `https://clinicaltrials.gov/study/${id}`,
      retrievedAt: study?.retrievedAt || retrievedAt,
      sourceName: 'ClinicalTrials.gov',
      protocolSection: protocol,
    };
  });
}

/**
 * Fetch live, recruiting clinical trials for the given conditions.
 */
export async function fetchLiveTrials(conditions: string[]): Promise<ClinicalTrial[]> {
  if (!conditions || conditions.length === 0) return [];

  const sanitizedConditions = conditions
    .map(c => String(c || '').replace(/["\\]/g, '').trim())
    .filter(c => c.length > 1);

  if (sanitizedConditions.length === 0) return [];

  const primaryCondition = sanitizedConditions[0];

  // Try backend proxy if available
  if (BACKEND_BASE || import.meta.env.DEV) {
    try {
      const backendRes = await fetchWithTimeout(`${BACKEND_BASE}/api/trials?condition=${encodeURIComponent(primaryCondition)}&pageSize=6`, {}, 4000);
      if (backendRes.ok) {
        const json = await backendRes.json();
        if (json.studies && Array.isArray(json.studies) && json.studies.length > 0) {
          return mapStudiesFromRaw(json.studies);
        }
      }
    } catch (backendErr) {
      // Fallback to direct client-side fetch
    }
  }

  const queryCondParam = encodeURIComponent(primaryCondition);
  const url = `https://clinicaltrials.gov/api/v2/studies?query.cond=${queryCondParam}&filter.overallStatus=RECRUITING,ACTIVE_NOT_RECRUITING,ENROLLING_BY_INVITATION&pageSize=6&fields=NCTId,BriefTitle,OverallStatus,Phase,BriefSummary,ConditionsModule,ArmsInterventionsModule,ContactsLocationsModule,EligibilityModule`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`ClinicalTrials.gov API responded with ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const studies = Array.isArray(data?.studies) ? data.studies : [];

    // Fallback: If 0 results for primary and a secondary condition exists, attempt secondary
    if (studies.length === 0 && sanitizedConditions.length > 1) {
      const secondaryCondition = sanitizedConditions[1];
      const fallbackUrl = `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(secondaryCondition)}&filter.overallStatus=RECRUITING,ACTIVE_NOT_RECRUITING,ENROLLING_BY_INVITATION&pageSize=6&fields=NCTId,BriefTitle,OverallStatus,Phase,BriefSummary,ConditionsModule,ArmsInterventionsModule,ContactsLocationsModule,EligibilityModule`;
      try {
        const fallbackRes = await fetchWithTimeout(fallbackUrl);
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (Array.isArray(fallbackData?.studies) && fallbackData.studies.length > 0) {
            return mapStudiesFromRaw(fallbackData.studies);
          }
        }
      } catch {}
    }

    return mapStudiesFromRaw(studies);
  } catch (error) {
    console.error('Error fetching clinical trials:', error);
    throw error;
  }
}
