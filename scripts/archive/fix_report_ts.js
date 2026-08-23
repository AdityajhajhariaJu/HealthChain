import fs from 'fs';

let content = fs.readFileSync('src/components/ui/RichReportTemplate.tsx', 'utf-8');

content = content.replace(
  /systemicCorrelations\?: string\[\];/,
  `systemicCorrelations?: string[];\n  scientificLiteratureContext?: string;\n  alternativeOrRarePossibilities?: string;`
);

fs.writeFileSync('src/components/ui/RichReportTemplate.tsx', content, 'utf-8');
