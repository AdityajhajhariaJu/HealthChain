import fs from 'fs';

let content = fs.readFileSync('src/features/dashboard/DDxBoard.tsx', 'utf-8');

content = content.replace(
  /generateCaseConnectionMap\(topDiagnoses\)\.then\(mapData => \{\s*if \(mapData && isMounted\.current\) \{\s*updateCaseConnectionMap\(item\.id, mapData\);\s*\}\s*\}\)\.catch\(console\.error\)\.finally\(\(\) => \{\s*if \(isMounted\.current\) setIsAnalyzing\(false\);\s*\}\);/,
  `generateCaseConnectionMap(topDiagnoses).then(mapData => {
        if (mapData) {
          updateCaseConnectionMap(item.id, mapData);
        }
      }).catch(console.error).finally(() => {
        if (isMounted.current) setIsAnalyzing(false);
      });`
);

fs.writeFileSync('src/features/dashboard/DDxBoard.tsx', content, 'utf-8');
