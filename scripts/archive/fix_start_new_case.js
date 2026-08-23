import fs from 'fs';

let content = fs.readFileSync('src/features/mdt/MDTHubDashboard.tsx', 'utf-8');

// Add setActiveCase import
content = content.replace(
  /import \{ saveReviewSnapshot, updateCaseDifferentials \} from '\.\.\/\.\.\/services\/CaseEngine';/,
  `import { saveReviewSnapshot, updateCaseDifferentials, setActiveCase } from '../../services/CaseEngine';`
);

// Update onRestart
content = content.replace(
  /onRestart=\{\(\) => \{\s*setPhase\('intake'\);\s*setIntakeData\(\{ chiefComplaint: '', history: '', redFlags: false \}\);\s*setHistoryReport\(null\);\s*setSelectedSpecialists\(\[\]\);\s*setSpecialistTranscripts\(\{\}\);\s*\}\}/,
  `onRestart={() => {
              setActiveCase(null);
              setPhase('intake');
              setIntakeData({ chiefComplaint: '', history: '', redFlags: false });
              setHistoryReport(null);
              setSelectedSpecialists([]);
              setSpecialistTranscripts({});
            }}`
);

fs.writeFileSync('src/features/mdt/MDTHubDashboard.tsx', content, 'utf-8');
