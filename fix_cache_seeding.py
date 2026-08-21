import re

with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix restoring from active case
pattern1 = r"setSpecialistTranscripts\(latestMDT\.transcripts \|\| \{\}\);\n\s*const specs = \(latestMDT\.specialists \|\| \[\]\)\.map\(\(label: string\) => \{\n\s*return ALL_SPECIALISTS\.find\(s => s\.label === label\);\n\s*\}\)\.filter\(Boolean\);\n\s*setSelectedSpecialists\(specs\);\n\s*if \(latestMDT\.report\) \{\n\s*setHistoryReport\(latestMDT\.report\);\n\s*setPhase\('dashboard'\);\n\s*setDashboardTab\('mdt'\);\n\s*\}"
replacement1 = """setSpecialistTranscripts(latestMDT.transcripts || {});
        
        if (latestMDT.transcripts) {
          Object.keys(latestMDT.transcripts).forEach(specId => {
            const spec = ALL_SPECIALISTS.find(s => s.label === specId) || ALL_SPECIALISTS.find(s => s.id === specId);
            if (spec) {
              cachedMDTSpecialistStreams[spec.id] = {
                messages: latestMDT.transcripts[specId],
                status: 'done',
                step: latestMDT.transcripts[specId].length
              };
            }
          });
        }

        const specs = (latestMDT.specialists || []).map((label: string) => {
          return ALL_SPECIALISTS.find(s => s.label === label);
        }).filter(Boolean);
        setSelectedSpecialists(specs);

        if (latestMDT.report) {
          setHistoryReport(latestMDT.report);
          setPhase('dashboard');
          setDashboardTab('mdt');
        }"""

content = re.sub(pattern1, replacement1, content, flags=re.DOTALL)

# Fix importing from Parallel Specialists
pattern2 = r"setSelectedSpecialists\(specs\);\n\s*setSpecialistTranscripts\(parallelReview\.transcripts \|\| \{\}\);\n\s*const foundReport = parallelReview\.report;\n\s*if \(foundReport\) \{\n\s*setHistoryReport\(foundReport\);\n\s*setPhase\('dashboard'\);\n\s*setDashboardTab\('mdt'\);\n\s*\}"
replacement2 = """setSelectedSpecialists(specs);
          setSpecialistTranscripts(parallelReview.transcripts || {});
          
          if (parallelReview.transcripts) {
            Object.keys(parallelReview.transcripts).forEach(specId => {
              const spec = ALL_SPECIALISTS.find(s => s.label === specId) || ALL_SPECIALISTS.find(s => s.id === specId);
              if (spec) {
                cachedMDTSpecialistStreams[spec.id] = {
                  messages: parallelReview.transcripts[specId],
                  status: 'done',
                  step: parallelReview.transcripts[specId].length
                };
              }
            });
          }

          const foundReport = parallelReview.report;
          if (foundReport) {
            setHistoryReport(foundReport);
            setPhase('dashboard');
            setDashboardTab('mdt');
          }"""

content = re.sub(pattern2, replacement2, content, flags=re.DOTALL)

with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
