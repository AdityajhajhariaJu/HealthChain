import fs from 'fs';

let content = fs.readFileSync('src/features/mdt/MDTHub.tsx', 'utf-8');

content = content.replace(
  /const foundReport = parallelReview\.report;\n\s*if \(foundReport\) \{\n\s*setHistoryReport\(foundReport\);\n\s*setPhase\('dashboard'\);\n\s*setDashboardTab\('mdt'\);\n\s*\}/,
  `const foundReport = parallelReview.report;
          if (foundReport) {
            setHistoryReport(foundReport);
            setPhase('dashboard');
            setDashboardTab('specialists');
          }`
);

fs.writeFileSync('src/features/mdt/MDTHub.tsx', content, 'utf-8');
