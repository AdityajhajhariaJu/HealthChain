import fs from 'fs';

let content = fs.readFileSync('src/features/mdt/MDTHubDashboard.tsx', 'utf-8');

// Inside MDTHubDashboard.tsx, we need to clear cachedMDTSpecialistStreams
const replacement = `onRestart={() => {
              // 1. Wipe the module-level stream cache to prevent infinite compiling loops
              Object.keys(cachedMDTSpecialistStreams).forEach(key => delete cachedMDTSpecialistStreams[key]);
              
              // 2. Wipe the sessionStorage streams so the LLM doesn't hallucinate past cases
              Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('hc_stream_')) sessionStorage.removeItem(key);
              });
              sessionStorage.removeItem('hc_mdt_intake_draft');

              setActiveCase(null);
              setPhase('intake');
              setIntakeData({ chiefComplaint: '', history: '', redFlags: false });
              setHistoryReport(null);
              setSelectedSpecialists([]);
              setSpecialistTranscripts({});
            }}`;

content = content.replace(
  /onRestart=\{\(\) => \{\s*setActiveCase\(null\);\s*setPhase\('intake'\);\s*setIntakeData\(\{ chiefComplaint: '', history: '', redFlags: false \}\);\s*setHistoryReport\(null\);\s*setSelectedSpecialists\(\[\]\);\s*setSpecialistTranscripts\(\{\}\);\s*\}\}/,
  replacement
);

fs.writeFileSync('src/features/mdt/MDTHubDashboard.tsx', content, 'utf-8');
