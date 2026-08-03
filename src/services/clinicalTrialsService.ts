export interface ClinicalTrial {
  id: string;
  title: string;
  phase: string;
  status: string;
  location: string;
  summary: string;
  conditions: string[];
  interventions: string[];
  matchScore?: number; // AI will fill this
  aiContext?: string; // AI will fill this explaining why it matches
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
 * Fetch live, recruiting clinical trials for the given conditions.
 */
export async function fetchLiveTrials(conditions: string[]): Promise<ClinicalTrial[]> {
  if (!conditions || conditions.length === 0) return [];

  // For better matching, we'll query using the primary condition.
  // ClinicalTrials.gov Essie syntax supports OR, but for simple fetching, we'll use query.cond
  const primaryCondition = conditions[0];
  const url = `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(
    primaryCondition
  )}&filter.overallStatus=RECRUITING&pageSize=5&fields=NCTId,BriefTitle,OverallStatus,Phase,BriefSummary,ConditionsModule,ArmsInterventionsModule,ContactsLocationsModule`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch trials: ${response.statusText}`);
    }

    const data = await response.json();
    const studies = data.studies || [];

    return studies.map((study: any) => {
      const protocol = study.protocolSection;
      
      const id = protocol?.identificationModule?.nctId || 'Unknown NCT';
      const title = protocol?.identificationModule?.briefTitle || 'Untitled Study';
      const status = protocol?.statusModule?.overallStatus || 'Unknown';
      const phase = (protocol?.designModule?.phases || ['Phase Unknown']).join(', ');
      const summary = protocol?.descriptionModule?.briefSummary || 'No summary provided.';
      const conds = protocol?.conditionsModule?.conditions || [];
      
      const interventionsList = protocol?.armsInterventionsModule?.interventions || [];
      const interventions = interventionsList.map((i: any) => i.name);

      const locations = protocol?.contactsLocationsModule?.locations || [];
      let locationStr = 'Multiple Locations / Unknown';
      if (locations.length > 0) {
        const firstLoc = locations[0];
        locationStr = `${firstLoc.facility || 'Facility'}, ${firstLoc.city || ''}, ${firstLoc.country || ''}`.replace(/,\s*,/g, ',');
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
      };
    });
  } catch (error) {
    console.error('Error fetching clinical trials:', error);
    return [];
  }
}
