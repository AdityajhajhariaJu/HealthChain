import re

with open('src/services/geminiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace the logic from `const isElevated = ...` down to `const MDT_SPECIALIST_PROMPT = ...`

new_logic = """  const isElevated = !!intakeData.sharedCaseMaterial || (typeof intakeData.chiefComplaint === 'string' && intakeData.chiefComplaint.includes('Shared Case Material:'));
  const sharedContext = isElevated && intakeData.sharedCaseMaterial ? `\\nShared Case Context (Existing Investigation Data):\\n${intakeData.sharedCaseMaterial}` : '';

  const questionCount = Math.floor(messages.length / 2);

  const isFollowUp = typeof intakeData.chiefComplaint === 'string' && intakeData.chiefComplaint.includes('[FOLLOW-UP FROM PREVIOUS EVALUATION]');

  let questionRule;
  let enforcementRule;

  if (isElevated) {
    // MDT Deep Collab Board (either new or imported case)
    questionRule = `[SPECIAL INSTRUCTION]: This patient's case is being reviewed by a Collaborative Board. DO NOT ask basic intake questions. You may ask 1 or 2 highly targeted cross-questions to resolve conflicts in the evidence or clarify changes. IF the provided case context is sufficient to form a hypothesis (e.g. the patient states their symptoms are the same), output exactly "ANALYSIS_COMPLETE" in the "response" field IMMEDIATELY. Do not prolong the questioning unnecessarily.`;
    
    enforcementRule = questionCount >= 3 
      ? `\\n\\n[SYSTEM DIRECTIVE]: You have asked enough questions for this collaborative review. You MUST output exactly "ANALYSIS_COMPLETE" in the "response" field now.`
      : '';
  } else if (isFollowUp) {
    // Single Specialist Follow-Up (Quick Consult Import)
    questionRule = `[SPECIAL INSTRUCTION]: This is a follow-up evaluation where the patient is challenging a previous diagnosis or presenting new findings. YOUR ENTIRE FOCUS must be on investigating these discrepancies. Cross-question their new symptoms, analyze the new reports against the old baseline. \\nYou MUST ask questions to deeply investigate. Do NOT output "ANALYSIS_COMPLETE" until you have asked at least 3 questions, or until the user explicitly tells you they have no more information. You have currently asked ${questionCount} questions. You may ask up to 8 questions in total.`;
    
    enforcementRule = questionCount >= 8 
      ? `\\n\\n[SYSTEM DIRECTIVE]: You have reached the maximum limit of 8 questions. You MUST output exactly "ANALYSIS_COMPLETE" in the "response" field now. Do not ask any more questions.`
      : (questionCount === 7 
          ? `\\n\\n[SYSTEM DIRECTIVE]: This is your final question (8 of 8). You MUST end your response by saying something similar to: "This is my last question. Please provide any remaining details, and I will conclude my revised analysis."`
          : '');
  } else {
    // Normal Single Specialist (Quick Consult New)
    questionRule = `You have currently asked ${questionCount} questions. You may ask up to 8 questions in total to be extremely thorough. \\nIf you have enough information to form a strong hypothesis, or if you reach 8 questions, output exactly "ANALYSIS_COMPLETE" in the "response" field immediately.`;

    enforcementRule = questionCount >= 8
      ? `\\n\\n[SYSTEM DIRECTIVE]: You have reached the maximum limit of 8 questions. You MUST output exactly "ANALYSIS_COMPLETE" in the "response" field now. Do not ask any more questions.`
      : (questionCount === 7
          ? `\\n\\n[SYSTEM DIRECTIVE]: This is your final question (8 of 8). You MUST end your response by saying something similar to: "This is my last question. Please provide any remaining details, and I will conclude my analysis."`
          : '');
  }

  const MDT_SPECIALIST_PROMPT = `"""

# Regex to find the chunk to replace
pattern = r"  const isElevated = !!intakeData\.sharedCaseMaterial;(.*?)\n  const MDT_SPECIALIST_PROMPT = `"
content = re.sub(pattern, new_logic, content, flags=re.DOTALL)

with open('src/services/geminiService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
