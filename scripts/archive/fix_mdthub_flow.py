import re

with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update handleSpecialistComplete to do everything automatically in the background
new_handle = """  const handleSpecialistComplete = useCallback((id: string, transcript: any[]) => {
    setSpecialistTranscripts((prev) => {
      const updated = { ...prev, [id]: transcript };
      if (Object.keys(updated).length === selectedSpecialists.length) {
        setPhase('compiling');
        
        (async () => {
          const startTime = Date.now();
          try {
            const cleanTranscripts: Record<string, string> = {};
            Object.keys(updated).forEach((specId) => {
              const specName = selectedSpecialists.find((s: any) => s.id === specId)?.label || specId;
              cleanTranscripts[specName] = updated[specId]
                ?.map((m: any) => `${m.role}: ${m.text}`)
                .join('\\n') || '';
            });

            // Run backend synthesis
            const conferenceData = await runMDTConference(intakeData, cleanTranscripts, activeCase?.medicalRecords || []);
            const safeConferenceData = conferenceData || {
              corroborations: [],
              contentions: [],
              followUpQuestions: [],
              debateSummary: "Synthesized available information."
            };

            const report = await generateMDTReport(intakeData, safeConferenceData, {}, activeCase?.medicalRecords || []);
            
            const elapsed = Date.now() - startTime;
            if (elapsed < 15000) {
              await new Promise(resolve => setTimeout(resolve, 15000 - elapsed));
            }

            setHistoryReport(report);
            setPhase('report');
          } catch (e) {
            console.error('Failed to generate MDT report', e);
            const elapsed = Date.now() - startTime;
            if (elapsed < 15000) {
              await new Promise(resolve => setTimeout(resolve, 15000 - elapsed));
            }
            alert('Failed to generate consensus report. Please try again.');
          }
        })();
      }
      return updated;
    });
  }, [setSpecialistTranscripts, selectedSpecialists, setPhase, intakeData, activeCase]);"""

# Replace old handleSpecialistComplete
# old one is:
#  const handleSpecialistComplete = useCallback((id: string, transcript: any[]) => {
#    setSpecialistTranscripts((prev) => {
#      const updated = { ...prev, [id]: transcript };
#      if (Object.keys(updated).length === selectedSpecialists.length) {
#        setPhase('compiling');
#        setTimeout(() => setPhase('conference'), 15000);
#      }
#      return updated;
#    });
#  }, [setSpecialistTranscripts, selectedSpecialists.length, setPhase]);

pattern = r'const handleSpecialistComplete = useCallback\(\(id: string, transcript: any\[\]\) => \{.*?\}, \[setSpecialistTranscripts, selectedSpecialists\.length, setPhase\]\);'
content = re.sub(pattern, new_handle, content, flags=re.DOTALL)

# 2. Remove the {phase === 'conference' && (<MDTConferencePanel />)} block
conf_pattern = r'\{phase === \'conference\' && \(\s*<motion\.div\s*key="conference".*?<MDTConferencePanel.*?</motion\.div>\s*\)\}'
content = re.sub(conf_pattern, '', content, flags=re.DOTALL)

with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
