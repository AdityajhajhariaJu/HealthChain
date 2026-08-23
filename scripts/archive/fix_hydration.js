import fs from 'fs';

let content = fs.readFileSync('src/features/mdt/MDTHub.tsx', 'utf-8');

// Fix handleElevateParallel
content = content.replace(
  /setActiveCase\(getActiveCase\(\)\);\s*setDashboardTab\('specialists'\);\s*setPhase\('dashboard'\);/g,
  `setGlobalActiveCase(caseItem.id);
        setActiveCase(getActiveCase());
        setDashboardTab('specialists');
        setPhase('dashboard');`
);

// Fix handleReviewPastMDT
content = content.replace(
  /setActiveCase\(caseItem\);\s*setPhase\('dashboard'\);/g,
  `setGlobalActiveCase(caseItem.id);
      setActiveCase(getActiveCase());
      setPhase('dashboard');`
);

fs.writeFileSync('src/features/mdt/MDTHub.tsx', content, 'utf-8');
