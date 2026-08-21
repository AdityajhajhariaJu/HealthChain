import fs from 'fs';

let content = fs.readFileSync('src/features/mdt/MDTHubDashboard.tsx', 'utf-8');

content = content.replace(
  /display: \(\!isMobile \|\| mobileActiveTab === i\) \? 'flex' : 'none',/g,
  `display: (mobileActiveTab === i) ? 'flex' : 'none',`
);

fs.writeFileSync('src/features/mdt/MDTHubDashboard.tsx', content, 'utf-8');
