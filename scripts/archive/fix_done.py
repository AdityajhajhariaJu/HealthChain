import re

with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update handleSpecialistComplete with saving logic and setPhase('done')
new_saving_logic = """
            const elapsed = Date.now() - startTime;
            if (elapsed < 15000) {
              await new Promise(resolve => setTimeout(resolve, 15000 - elapsed));
            }

            // Save snapshot to CaseEngine
            saveReviewSnapshot({
              type: 'mdt',
              report,
              transcripts: updated,
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
            setPhase('done');
"""

# Replace the specific lines inside the try block
pattern_try = r'const elapsed = Date\.now\(\) - startTime;\s*if \(elapsed < 15000\) \{.*?setHistoryReport\(report\);\s*setPhase\(\'report\'\);'
content = re.sub(pattern_try, new_saving_logic.strip(), content, flags=re.DOTALL)


# 2. Render the "done" phase UI (Success Screen)
done_ui = """
            {phase === 'done' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: 'rgba(255, 255, 255, 0.25)',
                  backdropFilter: 'blur(24px)',
                  padding: isMobile ? '32px' : '32px 64px 64px',
                  borderRadius: '32px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  textAlign: 'center',
                  maxWidth: '600px',
                  margin: '40px auto 0'
                }}
              >
                <div style={{ width: 64, height: 64, background: '#DCFCE7', color: '#16A34A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path></svg>
                </div>
                <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', marginBottom: '8px' }}>Assessment Complete</h2>
                <p style={{ color: '#64748B', fontSize: '16px', marginBottom: '40px', maxWidth: '400px', margin: '0 auto 40px auto' }}>
                  The Multi-Disciplinary Board has finalized your case and generated the consensus report.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px', margin: '0 auto' }}>
                  <button 
                    onClick={() => navigate(`/app/cases/${activeCase?.id}`)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: 'rgba(255, 255, 255, 0.4)',
                      border: '2px solid #E2E8F0',
                      borderRadius: '16px',
                      fontWeight: 700,
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '15px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#FFF'; }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
                    View Case Summary
                  </button>
                  
                  <button 
                    onClick={() => navigate('/app/collab')}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: 'linear-gradient(135deg, #4F46E5, #9333EA)',
                      border: 'none',
                      borderRadius: '16px',
                      fontWeight: 700,
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '15px',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
                    }}
                  >
                    Start New Case
                  </button>
                </div>
              </motion.div>
            )}
"""

pattern_insert_done = r'(\{phase === \'compiling\' && \(\s*<motion\.div.*?</motion\.div>\s*\)\s*\})'
content = re.sub(pattern_insert_done, r'\1\n' + done_ui, content, flags=re.DOTALL)

with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
