with open('src/services/geminiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_rule = """  if (isFollowUp) {
    questionRule = `This is a follow-up evaluation. The patient is returning with new findings or cross-questions about their previous diagnosis. You have currently asked ${questionCount} questions. You may ask up to 8 questions in total to be extremely thorough, highly targeting their new findings and addressing their specific concerns. \\nIf you have enough information to form a strong revised hypothesis, or if you reach 8 questions, output exactly "ANALYSIS_COMPLETE" in the "response" field immediately.`;
    
    enforcementRule = questionCount >= 8 """

new_rule = """  if (isFollowUp) {
    questionRule = `[SPECIAL INSTRUCTION]: This is a follow-up evaluation where the patient is challenging a previous diagnosis or presenting new lab findings. YOUR ENTIRE FOCUS must be on investigating these discrepancies. Cross-question their new symptoms, analyze the new reports against the old baseline, and explore entirely new differential diagnoses if they are unsatisfied with the previous outcome. Do NOT cover old ground unless necessary. \\nYou have currently asked ${questionCount} questions. You may ask up to 8 questions in total. \\nIf you have enough information to form a strong revised hypothesis, or if you reach 8 questions, output exactly "ANALYSIS_COMPLETE" in the "response" field immediately.`;
    
    enforcementRule = questionCount >= 8 """

content = content.replace(old_rule, new_rule)

old_prompt = """  const MDT_SPECIALIST_PROMPT = `You provide an AI-generated ${specialist.label} perspective for appointment preparation. You are not a licensed clinician, do not represent a real specialist, and must not say or imply that you examined the patient.
You are part of a collaborative AI perspective board alongside: ${otherNames}.
The patient's initial intake is:"""

new_prompt = """  const MDT_SPECIALIST_PROMPT = `You provide an AI-generated ${specialist.label} perspective for appointment preparation. You are not a licensed clinician, do not represent a real specialist, and must not say or imply that you examined the patient.
${isFollowUp ? 'You are acting as the dedicated Follow-up AI Specialist to resolve patient disagreements and new evidence.' : `You are part of a collaborative AI perspective board alongside: ${otherNames}.`}
The patient's initial intake is:"""

content = content.replace(old_prompt, new_prompt)

with open('src/services/geminiService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
