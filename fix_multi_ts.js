import fs from 'fs';

let content = fs.readFileSync('src/features/mdt/MultiSpecialistComponents.tsx', 'utf-8');

const correctSubmitAnswer = `const submitAnswer = async (text: string) => {
      if (status !== 'questioning') return;
      
      const sharedSubmit = getSharedContext();
      const contextualText = sharedSubmit ? (text + '\\n\\n[SYSTEM NOTE: Meanwhile, the patient has also shared this with other specialists on the board:\\n' + sharedSubmit + '\\nUse this to avoid redundant questions.]') : text;
      
      const displayMessage = { role: 'user', text }; // What UI shows
      const apiMessages = [...messages, { role: 'user', text: contextualText }]; // What API sees
      const nextMessagesState = [...messages, displayMessage];
      
      setMessages(nextMessagesState);
      setStatus('thinking');
      setStep(prev => prev + 1);
  
      try {
        const response = await chatWithMDTSpecialist(apiMessages, specialist, allSpecialists, intakeData, activeDifferentials);
        if (response.includes('ANALYSIS_COMPLETE')) {
          setStatus('done');
          if (onComplete) onComplete(specialist.id, [...nextMessagesState, { role: 'ai', text: response }]);
        } else {
          setMessages((prev) => [...prev, { role: 'ai', text: response }]);
          setStatus('questioning');
        }`;

content = content.replace(
  /const submitAnswer = async \(text: string\) => \{[\s\S]*?setStatus\('questioning'\);\s*\}/,
  correctSubmitAnswer
);

fs.writeFileSync('src/features/mdt/MultiSpecialistComponents.tsx', content, 'utf-8');
