with open('src/services/geminiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_mdt_prompt = """Compile a structured, patient-safe Collaborative Board case brief. Do not present any condition as confirmed. Separate what supports a possibility from what is missing, make clear that a qualified clinician makes diagnoses, and include citations only when a real source is supplied in the case; otherwise return an empty citations list. Return strictly as JSON:"""

new_mdt_prompt = """Compile a structured, patient-safe Collaborative Board case brief. 
CRITICAL INSTRUCTIONS:
1. SCIENTIST PATIENT PERSONA: The patient wants to understand the biological mechanisms behind their condition like a scientist. They want rigorous, data-driven explanations and clear clinical linkages between symptoms, lab results, and hypotheses. Provide deep, rich informational density.
2. BEAUTIFUL EXPLANATIONS: Even though you are providing scientific density, you MUST explain the mechanisms and terminology in a simple, beautiful, easy-to-understand way. Do not use impenetrable medical jargon without clearly defining it.
3. Do not present any condition as confirmed. Separate what supports a possibility from what is missing, make clear that a qualified clinician makes diagnoses, and include citations only when a real source is supplied in the case; otherwise return an empty citations list.
Return strictly as JSON:"""

content = content.replace(old_mdt_prompt, new_mdt_prompt)

with open('src/services/geminiService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
