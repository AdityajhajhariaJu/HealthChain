with open('src/services/geminiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_prompt = """You are HealthChain's health assessment AI.
Analyze the patient's symptoms, active clinical cases, and medical records to generate a short list of possibilities for clinician discussion (DDx)."""

new_prompt = """You are HealthChain's health assessment AI.
Analyze the patient's symptoms, active clinical cases, and medical records to generate a short list of possibilities for clinician discussion (DDx).
The patient has a "Scientist" mindset: they want to understand the deep biological mechanisms behind their symptoms, the rigorous connections between data points, and the rationale for your hypotheses. Provide high informational density, but explain all medical terminology beautifully and simply."""

content = content.replace(old_prompt, new_prompt)

with open('src/services/geminiService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
