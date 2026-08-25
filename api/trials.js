const ALLOWED_ORIGINS = [
  'https://www.healthchain360.com',
  'https://healthchain360.com',
  'https://healthchain-live.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'capacitor://localhost',
  'http://localhost'
];

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const isAllowed = origin && (
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.vercel.app') ||
    origin.endsWith('healthchain360.com')
  );
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-HC-Request-Id');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const queryCondition = req.query?.condition || req.body?.condition || req.query?.q || 'diabetes';
  const pageSize = parseInt(req.query?.pageSize || req.body?.pageSize || '8', 10);

  const url = `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(
    queryCondition
  )}&filter.overallStatus=RECRUITING,ACTIVE_NOT_RECRUITING,ENROLLING_BY_INVITATION&pageSize=${pageSize}&fields=NCTId,BriefTitle,OverallStatus,Phase,BriefSummary,ConditionsModule,ArmsInterventionsModule,ContactsLocationsModule`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({ error: `ClinicalTrials API responded with ${response.statusText}` });
    }

    const data = await response.json();
    const studies = (data.studies || []).map((study) => {
      const protocol = study.protocolSection;
      const id = protocol?.identificationModule?.nctId || 'Unknown NCT';
      const title = protocol?.identificationModule?.briefTitle || 'Untitled Study';
      const status = protocol?.statusModule?.overallStatus || 'Unknown';
      const phase = (protocol?.designModule?.phases || ['Phase Unknown']).join(', ');
      const summary = protocol?.descriptionModule?.briefSummary || 'No summary provided.';
      const conds = protocol?.conditionsModule?.conditions || [];
      const interventionsList = protocol?.armsInterventionsModule?.interventions || [];
      const interventions = interventionsList.map((i) => i.name);
      const locations = protocol?.contactsLocationsModule?.locations || [];
      let locationStr = 'Multiple Locations / Global';
      if (locations.length > 0) {
        const firstLoc = locations[0];
        locationStr = `${firstLoc.facility || 'Clinical Site'}, ${firstLoc.city || ''}, ${firstLoc.country || ''}`.replace(/,\s*,/g, ',');
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

    return res.status(200).json({ studies, total: studies.length });
  } catch (err) {
    console.error('Error in /api/trials backend handler:', err);
    return res.status(500).json({ error: 'Failed to fetch clinical trials', details: err.message });
  }
}
