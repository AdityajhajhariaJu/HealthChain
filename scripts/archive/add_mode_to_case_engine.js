import fs from 'fs';

let content = fs.readFileSync('src/services/CaseEngine.ts', 'utf-8');

content = content.replace(
  /export interface CaseItem \{\s*id: string;\s*title: string;\s*status: 'active' \| 'archived';/,
  `export interface CaseItem {
  id: string;
  title: string;
  mode?: 'multi' | 'mdt';
  status: 'active' | 'archived';`
);

content = content.replace(
  /export function createCaseDraft\(\{ title, intakeData = \{\}, specialists = \[\] \}: \{ title\?: string, intakeData\?: any, specialists\?: any\[\] \}\): CaseItem \{/,
  `export function createCaseDraft({ title, intakeData = {}, specialists = [], mode }: { title?: string, intakeData?: any, specialists?: any[], mode?: 'multi' | 'mdt' }): CaseItem {`
);

content = content.replace(
  /const item: CaseItem = \{\s*id: id\(\),\s*title: title \|\| 'Untitled health case',\s*status: 'active',/,
  `const item: CaseItem = {
    id: id(),
    title: title || 'Untitled health case',
    mode,
    status: 'active',`
);

fs.writeFileSync('src/services/CaseEngine.ts', content, 'utf-8');
