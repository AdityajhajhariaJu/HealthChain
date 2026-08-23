import fs from 'fs';

let content = fs.readFileSync('src/features/consultation/QuickConsult.tsx', 'utf-8');

const replacement = `  const resetConsult = () => {
    for (let key in cachedQuickConsultStreams) {
      delete cachedQuickConsultStreams[key];
    }
    
    // Wipe all stream caches so we don't hallucinate past consultations
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('hc_stream_')) sessionStorage.removeItem(key);
    });

    setPhase('select');
    setSelectedSpecialist(null);
    setSymptomInput('');
    setFinalTranscripts({});
    setActiveCase(null);
    sessionStorage.removeItem('hc_qc_phase');
    sessionStorage.removeItem('hc_qc_specialist');
    sessionStorage.removeItem('hc_qc_case');
  };`;

content = content.replace(/const resetConsult = \(\) => \{[\s\S]*?sessionStorage\.removeItem\('hc_qc_case'\);\s*\};/, replacement);

fs.writeFileSync('src/features/consultation/QuickConsult.tsx', content, 'utf-8');
