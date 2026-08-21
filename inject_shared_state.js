import fs from 'fs';

let content = fs.readFileSync('src/features/mdt/MultiSpecialistComponents.tsx', 'utf-8');

// We will inject a helper function inside useSpecialistStream
const fetchSharedContextCode = `
    const getSharedContext = () => {
      try {
        const otherDocs = allSpecialists.filter(s => s.id !== specialist.id);
        let sharedText = '';
        otherDocs.forEach(doc => {
          const saved = sessionStorage.getItem(\`hc_stream_\${doc.id}\`);
          if (saved) {
            const data = JSON.parse(saved);
            if (data.messages && data.messages.length > 0) {
              const userAnswers = data.messages.filter((m: any) => m.role === 'user' && !m.hidden).map((m: any) => m.text);
              if (userAnswers.length > 0) {
                sharedText += \`To \${doc.label}, the patient already stated: "\${userAnswers.join(' ')}".\\n\`;
              }
            }
          }
        });
        return sharedText;
      } catch (e) { return ''; }
    };
`;

content = content.replace(
  /const introStarted = useRef\(false\);/,
  `const introStarted = useRef(false);\n${fetchSharedContextCode}`
);

// Now update the triggerMessage (initial question)
content = content.replace(
  /const triggerMessage = \{\s*role: 'user',\s*text: 'Please begin your diagnostic assessment based on my intake file\. Ask the first question\.',\s*hidden: true,\s*\};/,
  `const sharedInit = getSharedContext();
          const triggerMessage = {
            role: 'user',
            text: 'Please begin your diagnostic assessment based on my intake file. Ask the first question.' + (sharedInit ? '\\n\\n[SYSTEM NOTE: The patient has already provided the following information to other specialists on the board. DO NOT ask about these things again:\\n' + sharedInit + ']' : ''),
            hidden: true,
          };`
);

// And update the submitAnswer function
content = content.replace(
  /const submitAnswer = async \(text\) => \{\s*if \(status !== 'questioning'\) return;\s*const newMessages = \[\.\.\.messages, \{ role: 'user', text \}\];/,
  `const submitAnswer = async (text: string) => {
      if (status !== 'questioning') return;
      
      const sharedSubmit = getSharedContext();
      const contextualText = sharedSubmit ? (text + '\\n\\n[SYSTEM NOTE: Meanwhile, the patient has also shared this with other specialists on the board:\\n' + sharedSubmit + '\\nUse this to avoid redundant questions.]') : text;
      
      const displayMessage = { role: 'user', text }; // What UI shows
      const apiMessages = [...messages, { role: 'user', text: contextualText }]; // What API sees
      
      setMessages([...messages, displayMessage]);`
);

content = content.replace(
  /const response = await chatWithMDTSpecialist\(newMessages, specialist, allSpecialists, intakeData, activeDifferentials\);/,
  `const response = await chatWithMDTSpecialist(apiMessages, specialist, allSpecialists, intakeData, activeDifferentials);`
);

fs.writeFileSync('src/features/mdt/MultiSpecialistComponents.tsx', content, 'utf-8');
