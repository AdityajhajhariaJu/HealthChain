with open('src/services/geminiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_rule = """  const questionRule = isElevated 
    ? `This patient has already been extensively interviewed by a Parallel Board. Do NOT ask basic questions. You may ask 1 or 2 highly targeted questions to resolve conflicts in the evidence. If the provided case context is sufficient to form a hypothesis, output exactly "ANALYSIS_COMPLETE" in the "response" field immediately.`
    : `You have currently asked ${questionCount} questions. You may ask up to 8 questions in total to be extremely thorough. \\nIf you have enough information to form a strong hypothesis, or if you reach 8 questions, output exactly "ANALYSIS_COMPLETE" in the "response" field immediately.`;

  const enforcementRule = questionCount >= 8 && !isElevated 
    ? `\\n\\n[SYSTEM DIRECTIVE]: You have reached the maximum limit of 8 questions. You MUST output exactly "ANALYSIS_COMPLETE" in the "response" field now. Do not ask any more questions.`
    : (questionCount === 7 && !isElevated 
        ? `\\n\\n[SYSTEM DIRECTIVE]: This is your final question (8 of 8). You MUST end your response by saying something similar to: "This is my last question. Please provide any remaining details, and I will conclude my analysis."`
        : '');"""

new_rule = """  const isFollowUp = typeof intakeData.chiefComplaint === 'string' && intakeData.chiefComplaint.includes('[FOLLOW-UP FROM PREVIOUS EVALUATION]');

  let questionRule;
  let enforcementRule;

  if (isFollowUp) {
    questionRule = `This is a follow-up evaluation. The patient is returning with new findings or cross-questions about their previous diagnosis. You have currently asked ${questionCount} questions. You may ask up to 8 questions in total to be extremely thorough, highly targeting their new findings and addressing their specific concerns. \\nIf you have enough information to form a strong revised hypothesis, or if you reach 8 questions, output exactly "ANALYSIS_COMPLETE" in the "response" field immediately.`;
    
    enforcementRule = questionCount >= 8 
      ? `\\n\\n[SYSTEM DIRECTIVE]: You have reached the maximum limit of 8 questions. You MUST output exactly "ANALYSIS_COMPLETE" in the "response" field now. Do not ask any more questions.`
      : (questionCount === 7 
          ? `\\n\\n[SYSTEM DIRECTIVE]: This is your final question (8 of 8). You MUST end your response by saying something similar to: "This is my last question. Please provide any remaining details, and I will conclude my revised analysis."`
          : '');
  } else {
    questionRule = isElevated 
      ? `This patient has already been extensively interviewed by a Parallel Board. Do NOT ask basic questions. You may ask 1 or 2 highly targeted questions to resolve conflicts in the evidence. If the provided case context is sufficient to form a hypothesis, output exactly "ANALYSIS_COMPLETE" in the "response" field immediately.`
      : `You have currently asked ${questionCount} questions. You may ask up to 8 questions in total to be extremely thorough. \\nIf you have enough information to form a strong hypothesis, or if you reach 8 questions, output exactly "ANALYSIS_COMPLETE" in the "response" field immediately.`;

    enforcementRule = questionCount >= 8 && !isElevated 
      ? `\\n\\n[SYSTEM DIRECTIVE]: You have reached the maximum limit of 8 questions. You MUST output exactly "ANALYSIS_COMPLETE" in the "response" field now. Do not ask any more questions.`
      : (questionCount === 7 && !isElevated 
          ? `\\n\\n[SYSTEM DIRECTIVE]: This is your final question (8 of 8). You MUST end your response by saying something similar to: "This is my last question. Please provide any remaining details, and I will conclude my analysis."`
          : '');
  }"""

content = content.replace(old_rule, new_rule)

with open('src/services/geminiService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
