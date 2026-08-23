import fs from 'fs';

let content = fs.readFileSync('src/features/mdt/MDTHub.tsx', 'utf-8');

// Replace the elapsed delay in the success path
content = content.replace(
  /const elapsed = Date\.now\(\) - startTime;\s*if \(elapsed < 15000\) \{\s*await new Promise\(resolve => setTimeout\(resolve, 15000 - elapsed\)\);\s*\}/g,
  `const elapsed = Date.now() - startTime;
            if (elapsed < 3000) {
              await new Promise(resolve => setTimeout(resolve, 3000 - elapsed));
            }`
);

fs.writeFileSync('src/features/mdt/MDTHub.tsx', content, 'utf-8');
