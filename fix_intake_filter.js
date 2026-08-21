import fs from 'fs';

let content = fs.readFileSync('src/features/mdt/MDTComponents.tsx', 'utf-8');

content = content.replace(
  /setParallelCases\(cases\.filter\(\(c: any\) => c\.mode === 'multi' && c\.stage !== 'mdt_complete'\)\);\s*setMdtCases\(cases\.filter\(\(c: any\) => c\.mode === 'mdt'\)\);/,
  `setParallelCases(cases.filter((c: any) => (c.mode === 'multi' || c.currentStage === 'parallel_complete' || c.reviews?.some((r: any) => r.type === 'parallel')) && c.currentStage !== 'mdt_complete'));
    setMdtCases(cases.filter((c: any) => (c.mode === 'mdt' || c.currentStage === 'mdt_complete' || c.reviews?.some((r: any) => r.type === 'mdt'))));`
);

fs.writeFileSync('src/features/mdt/MDTComponents.tsx', content, 'utf-8');
