with open('src/services/geminiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_prompt = """const reportPrompt = `You are an AI assistant orchestrating parallel health-assessment perspectives.
The patient presented with: "${symptomInput}"

Below are the independent interview transcripts from several specialists who questioned the patient simultaneously, along with any uploaded medical records:
${formattedTranscripts}${recordsText}

Your task is to find the connections between these distinct evaluations, cross-correlate their findings with the medical records, and generate a unified case brief.
CRITICAL INSTRUCTIONS:
1. MERGE overlapping diagnoses: Do not list the same condition multiple times (e.g. do not list "Cervical Radiculopathy" 3 times just because 3 specialists mentioned it). Merge them into a single entry with combined evidence.
2. CONDENSE the Action Plan: Limit the action plan to a maximum of 5 distinct, high-yield steps. Do not repeat instructions. Merge overlapping recommendations (e.g. if 3 specialists recommend an MRI, only list "Obtain MRI" once).
3. Do not claim certainty; distinguish evidence from gaps and direct clinical decisions to qualified professionals.
4. Include citations only when a real source is supplied in the case; otherwise return an empty citations list.

Return strictly as JSON matching this exact structure:"""

new_prompt = """const reportPrompt = `You are an AI assistant orchestrating parallel health-assessment perspectives.
The patient presented with: "${symptomInput}"

Below are the independent interview transcripts from several specialists who questioned the patient simultaneously, along with any uploaded medical records:
${formattedTranscripts}${recordsText}

Your task is to find the connections between these distinct evaluations, cross-correlate their findings with the medical records, and generate a unified case brief.
CRITICAL INSTRUCTIONS:
1. SCIENTIST PATIENT PERSONA: The patient wants to understand the biological mechanisms behind their condition like a scientist. They want rigorous, data-driven explanations and clear clinical linkages between symptoms, lab results, and hypotheses. Provide deep, rich informational density.
2. BEAUTIFUL EXPLANATIONS: Even though you are providing scientific density, you MUST explain the mechanisms and terminology in a simple, beautiful, easy-to-understand way. Do not use impenetrable medical jargon without clearly defining it.
3. MERGE overlapping diagnoses: Do not list the same condition multiple times. Merge them into a single entry with combined evidence.
4. CONDENSE the Action Plan: Limit the action plan to a maximum of 5 distinct, high-yield steps.
5. Do not claim certainty; distinguish evidence from gaps and direct clinical decisions to qualified professionals.
6. Include citations only when a real source is supplied in the case; otherwise return an empty citations list.

Return strictly as JSON matching this exact structure:"""

content = content.replace(old_prompt, new_prompt)

with open('src/services/geminiService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
