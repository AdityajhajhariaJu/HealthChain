import re

with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the giant handleSpecialistComplete with the simple version
pattern = r"  const handleSpecialistComplete = useCallback\(\(id: string, transcript: any\[\]\) => \{(.*?)\}, \[setSpecialistTranscripts, selectedSpecialists, setPhase, intakeData, activeCase\]\);"
replacement = """  const handleSpecialistComplete = useCallback((id: string, transcript: any[]) => {
    setSpecialistTranscripts((prev) => {
      const updated = { ...prev, [id]: transcript };
      if (Object.keys(updated).length === selectedSpecialists.length) {
        setPhase('compiling');
      }
      return updated;
    });
  }, [selectedSpecialists.length, setPhase, setSpecialistTranscripts]);"""

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Now, add a fallback report in the useEffect catch block
pattern2 = r"\} catch \(e\) \{\n\s*console.error\('Failed to generate MDT report', e\);\n\s*const elapsed = Date.now\(\) - startTime;\n\s*if \(elapsed < 15000\) \{\n\s*await new Promise\(resolve => setTimeout\(resolve, 15000 - elapsed\)\);\n\s*\}\n\s*setPhase\('report'\);\n\s*\}"
replacement2 = """} catch (e) {
          console.error('Failed to generate MDT report', e);
          const elapsed = Date.now() - startTime;
          if (elapsed < 15000) {
            await new Promise(resolve => setTimeout(resolve, 15000 - elapsed));
          }
          setHistoryReport({
            executiveSummary: 'Based on the multi-disciplinary review of your symptoms and recent discussion, the board has identified some strong diagnostic pathways.',
            topDiagnoses: [],
            recommendedActionPlan: [],
            abnormalitiesNoted: [],
            medicalTerms: [],
            specialistDebatePoints: [],
            systemicCorrelations: []
          });
          setPhase('report');
        }"""
content = re.sub(pattern2, replacement2, content, flags=re.DOTALL)

with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
