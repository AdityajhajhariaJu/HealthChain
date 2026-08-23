import re

with open('src/services/geminiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_followup = """    questionRule = `[SPECIAL INSTRUCTION]: This is a follow-up evaluation where the patient is challenging a previous diagnosis or presenting new lab findings. YOUR ENTIRE FOCUS must be on investigating these discrepancies. Cross-question their new symptoms, analyze the new reports against the old baseline, and explore entirely new differential diagnoses if they are unsatisfied with the previous outcome. Do NOT cover old ground unless necessary. \\nYou have currently asked ${questionCount} questions. You may ask up to 8 questions in total. \\nIf you have enough information to form a strong revised hypothesis, or if you reach 8 questions, output exactly "ANALYSIS_COMPLETE" in the "response" field immediately.`;"""

new_followup = """    questionRule = `[SPECIAL INSTRUCTION]: This is a follow-up evaluation where the patient is challenging a previous diagnosis or presenting new lab findings. YOUR ENTIRE FOCUS must be on investigating these discrepancies. Cross-question their new symptoms, analyze the new reports against the old baseline, and explore entirely new differential diagnoses if they are unsatisfied with the previous outcome. Do NOT cover old ground unless necessary. \\nYou MUST ask questions to deeply investigate. Do NOT output "ANALYSIS_COMPLETE" until you have asked at least 4 questions, or until the user explicitly tells you they have no more information. You have currently asked ${questionCount} questions. You may ask up to 8 questions in total.`;"""

content = content.replace(old_followup, new_followup)

with open('src/services/geminiService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
