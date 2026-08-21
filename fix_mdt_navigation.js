import fs from 'fs';

let content = fs.readFileSync('src/features/mdt/MDTHub.tsx', 'utf-8');

// The replacement code:
const newCode = `          setHistoryReport(report);
          if (activeCase?.id) {
            navigate('/app/cases/' + activeCase.id);
          } else {
            setPhase('report');
          }`;

// Replace exactly that block inside the useEffect compiling phase
// There are two setHistoryReport(report); setPhase('report'); calls.
// 1. handleConferenceComplete (legacy/unused path)
// 2. The useEffect compiling phase block

content = content.replace(
  /setHistoryReport\(report\);\s+setPhase\('report'\);/g,
  newCode
);

fs.writeFileSync('src/features/mdt/MDTHub.tsx', content, 'utf-8');
