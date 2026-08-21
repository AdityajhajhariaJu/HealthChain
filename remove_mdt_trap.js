import fs from 'fs';

let content = fs.readFileSync('src/features/mdt/MDTHub.tsx', 'utf-8');

const regex = /\/\/ Restore from active case if we have a finished MDT review[\s\S]*?\}, \[activeCase, phase, setPhase, setDashboardTab\]\);/;
content = content.replace(regex, '');

fs.writeFileSync('src/features/mdt/MDTHub.tsx', content, 'utf-8');
