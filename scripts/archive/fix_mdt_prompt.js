import fs from 'fs';

let content = fs.readFileSync('src/services/geminiService.ts', 'utf-8');

const additionalRules = `
Your goal is to organize focused questions, possible evidence gaps, and clinician-discussion topics.
DO NOT REPEAT questions. Dig deeper or pivot to a new relevant area.
You MUST finish your assessment in under 8 questions. To do this, ask highly-styled, multi-part questions to maximize information gathering per turn. Do not waste turns on single details - ask for timing, severity, and associated symptoms together when relevant, while remaining conversational.

CRITICAL FORMATTING RULES:
1. Divide your response into 2-3 short paragraphs using standard newline characters (\\n\\n) so it is easy to read. Do not write one giant wall of text.
2. DO NOT repeatedly thank the user for answering (e.g. stop saying "Thank you for clarifying"). Just get straight to the next medical question to save time.
3. If the user mentions they already answered a similar question for another specialist, accept that and move to a different diagnostic angle.`;

content = content.replace(
  /Your goal is to organize focused questions, possible evidence gaps, and clinician-discussion topics\.[\s\S]*?while remaining conversational\./,
  additionalRules
);

fs.writeFileSync('src/services/geminiService.ts', content, 'utf-8');
