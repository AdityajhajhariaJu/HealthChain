import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Stethoscope, 
  ChevronRight, 
  Search, 
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { ALL_SPECIALISTS } from '../../data/specialists';
import { SpecialistPanel } from '../mdt/MultiSpecialistComponents';
import { createCaseDraft, saveReviewSnapshot } from '../../services/CaseEngine';
import { useIsMobile } from '../../hooks/useIsMobile';

const cachedQuickConsultStreams: any = {};

export default function QuickConsult() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [phase, setPhase] = useState<'select' | 'chat' | 'done'>('select');
  const [selectedSpecialist, setSelectedSpecialist] = useState<any>(null);
  const [symptomInput, setSymptomInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [finalTranscripts, setFinalTranscripts] = useState<any>({});
  const [activeCase, setActiveCase] = useState<any>(null);

  const filteredSpecialists = ALL_SPECIALISTS.filter((s) =>
    s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartConsult = async () => {
    if (!selectedSpecialist || !symptomInput.trim()) return;
    
    const caseTitle = symptomInput.split(' ').slice(0, 5).join(' ') + '...';
    const newCase = createCaseDraft({
      title: caseTitle,
      intakeData: { chiefComplaint: symptomInput },
      specialists: [selectedSpecialist.label]
    });
    
    setActiveCase(newCase);
    setPhase('chat');
  };

  const handleComplete = (id: string, messages: any[]) => {
    setFinalTranscripts({ [id]: messages });
    setPhase('done');
    
    if (activeCase) {
      const aiMessages = messages.filter(m => m.role === 'ai' && !m.text.includes('ANALYSIS_COMPLETE'));
      const summaryMessage = aiMessages[aiMessages.length - 1];
      let reportData = {
        executiveSummary: "Assessment completed by " + selectedSpecialist.label,
        topDiagnoses: [],
        recommendedActionPlan: [],
        fullTranscript: messages
      };
      
      try {
         if (summaryMessage && summaryMessage.text.includes('{')) {
             const jsonMatch = summaryMessage.text.match(/\{[\s\S]*\}/);
             if (jsonMatch) {
                 const parsed = JSON.parse(jsonMatch[0]);
                 if (parsed.currentHypotheses) {
                     reportData.executiveSummary = parsed.internalThoughts || reportData.executiveSummary;
                     reportData.topDiagnoses = parsed.currentHypotheses.map(h => ({ condition: h, confidence: 50 }));
                 }
             }
         }
      } catch(e) {}
      
      saveReviewSnapshot({
        caseId: activeCase.id,
        type: 'parallel',
        report: reportData,
        transcripts: { [id]: messages },
        specialists: [selectedSpecialist.label],
        basedOnEvidenceIds: []
      });
    }
  };

  useEffect(() => {
    // Default select GP if available
    if (phase === 'select' && !selectedSpecialist && !searchQuery) {
      const gp = ALL_SPECIALISTS.find(s => s.id === 'gp');
      if (gp) setSelectedSpecialist(gp);
    }
  }, [phase, selectedSpecialist, searchQuery]);

  return (
    <div style={{ maxWidth: isMobile ? '100%' : '800px', margin: '0 auto', paddingBottom: '40px', paddingTop: '20px' }}>
      <AnimatePresence mode="wait">
        {phase === 'select' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              background: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(24px)',
              padding: isMobile ? '20px' : '48px',
              borderRadius: '32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
              border: '1px solid rgba(255,255,255,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 11, background: '#EFF6FF', color: '#2563EB' }}>
                    <Stethoscope size={18} />
                  </div>
                  <span style={{ color: '#2563EB', fontWeight: 800, fontSize: 12, letterSpacing: '.8px' }}>QUICK CONSULT</span>
                </div>
                <h2 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 900, color: '#0F172A', margin: '0 0 8px 0', letterSpacing: '-.5px' }}>
                  What brings you here today?
                </h2>
                <p style={{ color: '#64748B', fontSize: '15px', margin: 0, fontWeight: 500 }}>
                  One-on-one specialist assessment.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <textarea
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                placeholder="Describe your symptoms, how long you've had them, and anything else relevant..."
                style={{
                  width: '100%',
                  minHeight: '160px',
                  padding: '20px',
                  borderRadius: 'var(--radius-lg, 12px)',
                  border: '1px solid #E2E8F0',
                  fontSize: '16px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none',
                  background: '#FFF',
                  color: '#0F172A',
                  transition: 'border-color 0.2s',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Select a Specialist
                </h3>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: '8px 12px 8px 36px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '14px',
                      width: '180px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                overflowX: 'auto', 
                gap: '12px', 
                paddingBottom: '16px',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}>
                {filteredSpecialists.map((s) => {
                  const Icon = s.icon;
                  const isSelected = selectedSpecialist?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSpecialist(s)}
                      style={{
                        flexShrink: 0,
                        width: '140px',
                        padding: '16px',
                        borderRadius: '12px',
                        border: `2px solid ${isSelected ? '#3B82F6' : '#E2E8F0'}`,
                        background: isSelected ? '#EFF6FF' : '#FFF',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.1)' : 'none'
                      }}
                      onMouseOver={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFC'; } }}
                      onMouseOut={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#FFF'; } }}
                    >
                      <div 
                        style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '10px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          marginBottom: '12px',
                          backgroundColor: s.bg, 
                          color: s.color 
                        }}
                      >
                        <Icon size={20} />
                      </div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>{s.label}</h4>
                      <p style={{ margin: 0, fontSize: '11px', color: '#64748B', lineHeight: 1.3 }}>{s.desc}</p>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleStartConsult}
                  disabled={!selectedSpecialist || !symptomInput.trim()}
                  style={{
                    padding: '16px 32px',
                    background: selectedSpecialist && symptomInput.trim() ? '#0F172A' : '#E2E8F0',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '999px',
                    fontWeight: 700,
                    fontSize: '16px',
                    cursor: selectedSpecialist && symptomInput.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                  }}
                >
                  Start Consult <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'chat' && selectedSpecialist && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(24px)',
              padding: isMobile ? '20px' : '48px',
              borderRadius: '32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
              border: '1px solid rgba(255,255,255,0.5)',
              minHeight: '600px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '12px', background: selectedSpecialist.bg, color: selectedSpecialist.color, display: 'grid', placeItems: 'center' }}>
                  <selectedSpecialist.icon size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{selectedSpecialist.label}</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>Quick Consult Assessment</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setPhase('select');
                  setSymptomInput('');
                  setSelectedSpecialist(null);
                  setFinalTranscripts({});
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Cancel
              </button>
            </div>
            
            <div style={{ margin: '-20px', marginTop: 0 }}>
               <SpecialistPanel
                specialist={selectedSpecialist}
                isRunning={true}
                isPaused={false}
                index={0}
                onComplete={handleComplete}
                allSpecialists={[selectedSpecialist]}
                intakeData={{ chiefComplaint: symptomInput }}
                activeDifferentials={[]}
                cachedSpecialistStreams={cachedQuickConsultStreams}
              />
            </div>
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(24px)',
              padding: isMobile ? '32px' : '64px',
              borderRadius: '32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
              border: '1px solid rgba(255,255,255,0.5)',
              textAlign: 'center'
            }}
          >
            <div style={{ width: 64, height: 64, background: '#DCFCE7', color: '#16A34A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
              <ShieldCheck size={32} />
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', marginBottom: '8px' }}>Assessment Complete</h2>
            <p style={{ color: '#64748B', fontSize: '16px', marginBottom: '40px', maxWidth: '400px', margin: '0 auto 40px auto' }}>
              Your consultation with the {selectedSpecialist?.label} has concluded and your case has been saved.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px', margin: '0 auto' }}>
              <button 
                onClick={() => navigate(`/app/cases/${activeCase?.id}`)}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: '#FFF',
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
                <FileText size={18} />
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
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 10px 25px rgba(147, 51, 234, 0.2)'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(147, 51, 234, 0.3)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(147, 51, 234, 0.2)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Stethoscope size={16} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '15px' }}>Escalate to Collaborative Specialists</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>Get a second opinion from multiple doctors</div>
                  </div>
                </div>
                <ChevronRight size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
