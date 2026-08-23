import re

with open('src/features/mdt/MultiSpecialistComponents.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace the intro logic
old_logic = """  const introQuestion = JSON.stringify({
    internalThoughts: `Reviewing intake. Preparing to assess patient for ${specialist.label} specific pathways.`,
    currentHypotheses: ["Awaiting initial patient response"],
    response: `Hello, I'm the **${specialist.label}**${collabString}. What specific issues or symptoms bring you to my field today?`,
    widgetType: "none"
  });

  const introStarted = useRef(false);

  useEffect(() => {
    if (!isRunning) {
      setMessages([]);
      setStatus('idle');
      setStep(0);
      introStarted.current = false;
      return;
    }
    
    if (status === 'idle' && step === 0 && !isPaused && !introStarted.current) {
      introStarted.current = true;
      setTimeout(() => {
        setStatus('thinking');
        setTimeout(
          () => {
            setMessages([{ role: 'ai', text: introQuestion }]);
            setStatus('questioning');
          },
          1000 + Math.random() * 800
        );
      }, startDelay);
    }
  }, [isRunning, isPaused, status, step, startDelay, introQuestion]);"""

new_logic = """  const introQuestion = JSON.stringify({
    internalThoughts: `Reviewing intake. Preparing to assess patient for ${specialist.label} specific pathways.`,
    currentHypotheses: ["Awaiting initial patient response"],
    response: `Hello, I'm the **${specialist.label}**${collabString}. What specific issues or symptoms bring you to my field today?`,
    widgetType: "none"
  });

  const introStarted = useRef(false);

  useEffect(() => {
    if (!isRunning) {
      setMessages([]);
      setStatus('idle');
      setStep(0);
      introStarted.current = false;
      return;
    }
    
    if (status === 'idle' && step === 0 && !isPaused && !introStarted.current) {
      introStarted.current = true;
      setTimeout(async () => {
        setStatus('thinking');
        
        // Trigger the AI to generate a highly specific first question based on intake
        const triggerMessage = {
          role: 'user',
          text: 'Please begin your diagnostic assessment based on my intake file. Ask the first question.',
          hidden: true,
        };
        const initialArray = [triggerMessage];
        
        try {
          const response = await chatWithMDTSpecialist(initialArray, specialist, allSpecialists, intakeData, activeDifferentials);
          if (response.includes('ANALYSIS_COMPLETE')) {
            setStatus('done');
            if (onComplete) onComplete(specialist.id, initialArray);
          } else {
            setMessages([triggerMessage, { role: 'ai', text: response }]);
            setStatus('questioning');
          }
        } catch (err) {
          console.error('Failed to fetch initial AI response:', err);
          // Fallback to generic hardcoded greeting
          setMessages([{ role: 'ai', text: introQuestion }]);
          setStatus('questioning');
        }
      }, startDelay);
    }
  }, [isRunning, isPaused, status, step, startDelay]);"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
else:
    print("Could not find old logic")

with open('src/features/mdt/MultiSpecialistComponents.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
