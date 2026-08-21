import fs from 'fs';

let content = fs.readFileSync('src/components/ui/CaseConnectionMap.tsx', 'utf-8');

content = content.replace(
  /<HelpCircle size=\{18\} \/> Missing Evidence<\/div>/,
  `<HelpCircle size={18} /> Ask your Doctor</div>`
);

fs.writeFileSync('src/components/ui/CaseConnectionMap.tsx', content, 'utf-8');
