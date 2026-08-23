import fs from 'fs';

let content = fs.readFileSync('src/features/mdt/MDTHub.tsx', 'utf-8');

// Part 1: Gather records
content = content.replace(
  /let enhancedComplaint = data\.chiefComplaint \|\| '';\s*try \{\s*if \(data\.files && data\.files\.length > 0\) \{/,
  `let enhancedComplaint = data.chiefComplaint || '';
      let newRecords: any[] = [];
      
      try {
        if (data.files && data.files.length > 0) {`
);

content = content.replace(
  /if \(result\) \{\s*enhancedComplaint \+= `\\n\\n--- Document: \$\{file\.name\} ---\\n`;\s*enhancedComplaint \+= `Test\/Report Type: \$\{result\.testName\}\\n`;\s*enhancedComplaint \+= `Key Findings: \$\{result\.keyFindings\}\\n`;\s*if \(result\.interpretation\) enhancedComplaint \+= `Interpretation: \$\{result\.interpretation\}\\n`;\s*\}/,
  `if (result) {
              enhancedComplaint += \`\\n\\n--- Document: \${file.name} ---\\n\`;
              enhancedComplaint += \`Test/Report Type: \${result.testName}\\n\`;
              enhancedComplaint += \`Key Findings: \${result.keyFindings}\\n\`;
              if (result.interpretation) enhancedComplaint += \`Interpretation: \${result.interpretation}\\n\`;
              newRecords.push({ filename: file.name, findings: result.keyFindings, source: 'mdt_hub' });
            }`
);

// Part 2: Save records
content = content.replace(
  /const \{ createCaseDraft, setActiveCase: dynSetActiveCase \} = await import\('\.\.\/\.\.\/services\/CaseEngine'\);\s*const newCase = createCaseDraft\(\{ title: enhancedComplaint\.slice\(0, 40\) \+ '\.\.\.', intakeData: \{ \.\.\.data, chiefComplaint: enhancedComplaint \} \}\);\s*dynSetActiveCase\(newCase\.id\);/,
  `const { createCaseDraft, setActiveCase: dynSetActiveCase, addEvidenceToActiveCase } = await import('../../services/CaseEngine');
        const newCase = createCaseDraft({ title: enhancedComplaint.slice(0, 40) + '...', intakeData: { ...data, chiefComplaint: enhancedComplaint } });
        dynSetActiveCase(newCase.id);
        
        for (const record of newRecords) {
          addEvidenceToActiveCase(record);
        }`
);

fs.writeFileSync('src/features/mdt/MDTHub.tsx', content, 'utf-8');
