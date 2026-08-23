import fs from 'fs';

let content = fs.readFileSync('src/features/mdt/MDTHubDashboard.tsx', 'utf-8');

content = content.replace(
  /<\/div>\s*\)\}\s*\{selectedSpecialists\.map\(\(s, i\) => \{/g,
  `</div>\n              {selectedSpecialists.map((s, i) => {`
);

fs.writeFileSync('src/features/mdt/MDTHubDashboard.tsx', content, 'utf-8');
