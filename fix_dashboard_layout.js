import fs from 'fs';

let content = fs.readFileSync('src/features/mdt/MDTHubDashboard.tsx', 'utf-8');

// Change grid to flex column for all
content = content.replace(
  /maxWidth: selectedSpecialists\.length === 1 \? '800px' : '100%', margin: '0 auto', display: isMobile \? 'flex' : 'grid',\s*flexDirection: isMobile \? 'column' : 'unset',\s*gridTemplateColumns: isMobile \? 'unset' : 'repeat\(auto-fit, minmax\(340px, 1fr\)\)',/,
  `maxWidth: '800px', margin: '0 auto', display: 'flex',
                flexDirection: 'column',`
);

// Remove {isMobile && ( around the tabs
content = content.replace(
  /\{isMobile && \(\s*<div style=\{\{ display: 'flex', overflowX: 'auto', gap: '8px', paddingBottom: '12px', WebkitOverflowScrolling: 'touch' \}\}>/,
  `<div style={{ display: 'flex', overflowX: 'auto', gap: '8px', paddingBottom: '12px', WebkitOverflowScrolling: 'touch', flexWrap: 'wrap', justifyContent: 'center' }}>`
);

// Find the end of the tabs block and remove the closing )}
content = content.replace(
  /<\/div>\s*\)\}\s*\{selectedSpecialists\.map\(\(s: any, i: number\) => \{/g,
  `</div>\n              {selectedSpecialists.map((s: any, i: number) => {`
);

// Apply visibility filter to desktop as well
content = content.replace(
  /if \(isMobile && i !== mobileActiveTab\) return null;/g,
  `if (i !== mobileActiveTab) return null;`
);

// Add cursor pointer to the tab button
content = content.replace(
  /fontWeight: 700,\s*fontSize: '13px',/g,
  `fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',`
);

fs.writeFileSync('src/features/mdt/MDTHubDashboard.tsx', content, 'utf-8');
