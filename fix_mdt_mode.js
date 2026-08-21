import fs from 'fs';

let content = fs.readFileSync('src/features/mdt/MDTHub.tsx', 'utf-8');

content = content.replace(
  /const newCase = createCaseDraft\(\{ title: enhancedComplaint\.slice\(0, 40\) \+ '\.\.\.', intakeData: \{ \.\.\.data, chiefComplaint: enhancedComplaint \} \}\);/,
  `const newCase = createCaseDraft({ title: enhancedComplaint.slice(0, 40) + '...', mode: 'mdt', intakeData: { ...data, chiefComplaint: enhancedComplaint } });`
);

fs.writeFileSync('src/features/mdt/MDTHub.tsx', content, 'utf-8');
