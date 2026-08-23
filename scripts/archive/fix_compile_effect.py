import re

with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add isCompilingRef
content = content.replace("const [isSessionPaused, setIsSessionPaused] = useState(false);", "const [isSessionPaused, setIsSessionPaused] = useState(false);\n  const isCompilingRef = React.useRef(false);")

# 2. Add useEffect for compilation
compilation_effect = """  React.useEffect(() => {
    if (phase === 'compiling' && !isCompilingRef.current) {
      isCompilingRef.current = true;
      (async () => {
        const startTime = Date.now();
        try {
          const cleanTranscripts: Record<string, string> = {};
          Object.keys(specialistTranscripts).forEach((specId) => {
            const specName = selectedSpecialists.find((s: any) => s.id === specId)?.label || specId;
            cleanTranscripts[specName] = specialistTranscripts[specId]
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

          // Save snapshot to CaseEngine
          saveReviewSnapshot({
            type: 'mdt',
            report,
            transcripts: specialistTranscripts,
            basedOnEvidenceIds: activeCase?.medicalRecords?.map((r: any) => r.id) || [],
            specialists: selectedSpecialists.map((s: any) => s.label),
            caseId: activeCase?.id || '',
          });

          if (activeCase?.id) {
            try {
              const results = await runDifferentialAnalysis(intakeData, activeCase.medicalRecords || [], getProfile());
              if (results && Array.isArray(results)) {
                updateCaseDifferentials(activeCase.id, results);
              }
            } catch(e) { console.error("Diff analysis failed", e); }
          }

          setHistoryReport(report);
          setPhase('report');
        } catch (e) {
          console.error('Failed to generate MDT report', e);
          const elapsed = Date.now() - startTime;
          if (elapsed < 15000) {
            await new Promise(resolve => setTimeout(resolve, 15000 - elapsed));
          }
          setPhase('report');
        } finally {
          isCompilingRef.current = false;
        }
      })();
    }
  }, [phase, activeCase, intakeData, selectedSpecialists, specialistTranscripts, setPhase]);

"""
content = content.replace("const handleSpecialistComplete = useCallback((id: string, transcript: any[]) => {", compilation_effect + "  const handleSpecialistComplete = useCallback((id: string, transcript: any[]) => {")

# 3. Simplify handleSpecialistComplete
pattern_to_replace = r"const handleSpecialistComplete = useCallback\(\(id: string, transcript: any\[\]\) => \{(.*?)\}, \[intakeData, selectedSpecialists, activeCase, setPhase\]\);"

simplified_handler = """const handleSpecialistComplete = useCallback((id: string, transcript: any[]) => {
      setSpecialistTranscripts((prev) => {
        const updated = { ...prev, [id]: transcript };
        if (Object.keys(updated).length === selectedSpecialists.length) {
          setPhase('compiling');
        }
        return updated;
      });
    }, [selectedSpecialists.length, setPhase, setSpecialistTranscripts]);"""

content = re.sub(pattern_to_replace, simplified_handler, content, flags=re.DOTALL)

with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
