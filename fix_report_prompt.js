import fs from 'fs';

let content = fs.readFileSync('src/services/geminiService.ts', 'utf-8');

// Add a scratchpad and enforce strict limits on rationale
content = content.replace(
  /"executiveSummary": "1 paragraph plain-language synthesis of the case and uncertainty\.",/,
  `"_scratchpad": "Use this field to output all your internal reasoning, chain of thought, and scientific debate. Do NOT put internal monologue in any other field.",
    "executiveSummary": "1 paragraph plain-language synthesis of the case and uncertainty.",`
);

content = content.replace(
  /"rationale": "Patient-friendly ELI5 explanation of why this condition is suspected, so the patient can easily understand it\.",/,
  `"rationale": "Patient-friendly ELI5 explanation of why this condition is suspected. MUST BE EXTREMELY CONCISE (MAX 2-3 SENTENCES). Do NOT include internal reasoning here.",`
);

// Add the missing fields
content = content.replace(
  /"systemicCorrelations": \["Bullet points explaining how symptoms connect across different body systems", "Leave empty if none"\],/,
  `"systemicCorrelations": ["Bullet points explaining how symptoms connect across different body systems", "Leave empty if none"],
    "scientificLiteratureContext": "A paragraph explaining what recent clinical research or literature says about this symptom cluster.",
    "alternativeOrRarePossibilities": "A brief mention of rare, environmental, or edge-case conditions a scientist might consider if standard tests are negative.",`
);

fs.writeFileSync('src/services/geminiService.ts', content, 'utf-8');
