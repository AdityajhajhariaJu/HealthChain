import { setCors } from '../server/cors.js';
import { allowedOrigin } from '../shared/http-origins.js';

export default async function handler(req, res) {
  setCors(req, res, {
    accepts: allowedOrigin,
    methods: 'GET, POST, OPTIONS',
    headers: 'Content-Type, Authorization, X-HC-Request-Id',
  });
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const queryCondition = req.query?.condition || req.body?.condition || req.query?.q || 'diabetes';
  if (typeof queryCondition !== 'string' || queryCondition.length > 300)
    return res.status(400).json({ error: 'invalid_condition' });
  const requestedSize = Number(req.query?.pageSize || req.body?.pageSize || 8);
  const pageSize = Number.isFinite(requestedSize)
    ? Math.max(1, Math.min(50, Math.trunc(requestedSize)))
    : 8;

  const url = `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(
    queryCondition
  )}&filter.overallStatus=RECRUITING,ACTIVE_NOT_RECRUITING,ENROLLING_BY_INVITATION&pageSize=${pageSize}&fields=NCTId,BriefTitle,OverallStatus,Phase,BriefSummary,ConditionsModule,ArmsInterventionsModule,ContactsLocationsModule,EligibilityModule`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `ClinicalTrials API responded with ${response.statusText}` });
    }

    const data = await response.json();
    const retrievedAt = new Date().toISOString();
    const studies = (data.studies || []).map((study) => {
      const protocol = study?.protocolSection || {};
      const id = protocol?.identificationModule?.nctId || 'Unknown NCT';
      const title = protocol?.identificationModule?.briefTitle || 'Untitled Study';
      const status = protocol?.statusModule?.overallStatus || 'Unknown';
      const phase = (protocol?.designModule?.phases || ['Phase Unknown']).join(', ');
      const summary = protocol?.descriptionModule?.briefSummary || 'No summary provided.';
      const conds = protocol?.conditionsModule?.conditions || [];
      const interventionsList = protocol?.armsInterventionsModule?.interventions || [];
      const interventions = interventionsList
        .map((i) => (typeof i === 'string' ? i : i?.name))
        .filter(Boolean);
      const locations = protocol?.contactsLocationsModule?.locations || [];
      let locationStr = 'Multiple Locations / Global';
      if (locations.length > 0) {
        const firstLoc = locations[0];
        locationStr =
          `${firstLoc.facility || 'Clinical Site'}, ${firstLoc.city || ''}, ${firstLoc.country || ''}`.replace(
            /,\s*,/g,
            ','
          );
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
        eligibility: protocol?.eligibilityModule || undefined,
        url: `https://clinicaltrials.gov/study/${id}`,
        retrievedAt,
        sourceName: 'ClinicalTrials.gov',
        protocolSection: protocol,
      };
    });

    return res.status(200).json({ studies, total: studies.length });
  } catch (err) {
    console.error('Error in /api/trials backend handler:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    clearTimeout(timeoutId);
  }
}
