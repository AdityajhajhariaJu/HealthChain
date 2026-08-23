import fs from 'fs';

let content = fs.readFileSync('src/services/geminiService.ts', 'utf-8');

// 1. Update the MDT Conference Prompt (Scientist Persona)
content = content.replace(
  /You are the Chief Clinical Orchestrator for a collaborative medical board\./,
  `You are the Chief Clinical Orchestrator and Lead Medical Research Scientist for a collaborative medical board. Your approach is deeply analytical, evidence-based, and rooted in the latest scientific literature. You synthesize data like a clinical researcher looking for root causes, mechanistic pathways, and scientific consensus.`
);

// 2. Update the Report Generation Prompt (Extra Broad Insights)
content = content.replace(
  /"systemicCorrelations": \[\{"symptom1": "...", "symptom2": "...", "mechanism": "..."\}\]/,
  `"systemicCorrelations": [{"symptom1": "...", "symptom2": "...", "mechanism": "..."}],
    "scientificLiteratureContext": "A paragraph explaining what recent clinical research or literature says about this symptom cluster.",
    "alternativeOrRarePossibilities": "A brief mention of rare, environmental, or edge-case conditions a scientist might consider if standard tests are negative."`
);

fs.writeFileSync('src/services/geminiService.ts', content, 'utf-8');
