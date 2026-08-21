import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  Stethoscope, 
  ChevronRight, 
  Search, 
  ArrowRight,
  ShieldCheck,
  FileText,
  Sparkles,
  Upload,
  Image,
  X,
  FileUp
} from 'lucide-react';
import { ALL_SPECIALISTS } from '../../data/specialists';
import { SpecialistPanel } from '../mdt/MultiSpecialistComponents';
import { createCaseDraft, getCase, saveReviewSnapshot, updateCaseConnectionMap } from '../../services/CaseEngine';
import { generateCaseConnectionMap } from '../../services/geminiService';
import { CaseConnectionMap } from '../../components/ui/CaseConnectionMap';
import { useIsMobile } from '../../hooks/useIsMobile';
import { CompilingAnimation } from '../../components/ui/CompilingAnimation';
import { getRunScope, clearRunStorage } from '../../services/RunContext';

const cachedQuickConsultStreams: any = {};
const quickPhaseKey = getRunScope('quick-consult', 'draft', 'phase');
const quickSpecialistKey = getRunScope('quick-consult', 'draft', 'specialist');
const quickCaseKey = getRunScope('quick-consult', 'draft', 'case');

export default function QuickConsult() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [phase, setPhase] = useState<'select' | 'upload' | 'chat' | 'compiling' | 'done'>(() => {
    return (sessionStorage.getItem(quickPhaseKey) as any) || 'select';
  });
  const [selectedSpecialist, setSelectedSpecialist] = useState<any>(() => {
    const savedId = sessionStorage.getItem(quickSpecialistKey);
    return savedId ? ALL_SPECIALISTS.find(s => s.id === savedId) || null : null;
  });
  const [symptomInput, setSymptomInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [finalTranscripts, setFinalTranscripts] = useState<any>({});
  const [activeCase, setActiveCase] = useState<any>(() => {
    try {
      const saved = sessionStorage.getItem(quickCaseKey);
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.id ? getCase(parsed.id) || parsed : null;
    } catch {
      sessionStorage.removeItem(quickCaseKey);
      return null;
    }
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionHandledRef = useRef(false);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => () => {
    if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
  }, []);

  const resetConsult = () => {
    if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    completionHandledRef.current = false;
    for (let key in cachedQuickConsultStreams) {
      delete cachedQuickConsultStreams[key];
    }
    
    // Wipe all stream caches so we don't hallucinate past consultations
    clearRunStorage('quick-consult');

    setPhase('select');
    setSelectedSpecialist(null);
    setSymptomInput('');
    setFinalTranscripts({});
    setActiveCase(null);
    sessionStorage.removeItem(quickPhaseKey);
    sessionStorage.removeItem(quickSpecialistKey);
    sessionStorage.removeItem(quickCaseKey);
  };

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      resetConsult();
      searchParams.delete('new');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => { sessionStorage.setItem(quickPhaseKey, phase); }, [phase]);
  useEffect(() => {
    if (selectedSpecialist) sessionStorage.setItem(quickSpecialistKey, selectedSpecialist.id);
    else sessionStorage.removeItem(quickSpecialistKey);
  }, [selectedSpecialist]);
  useEffect(() => {
    if (activeCase) sessionStorage.setItem(quickCaseKey, JSON.stringify(activeCase));
    else sessionStorage.removeItem(quickCaseKey);
  }, [activeCase]);

  const filteredSpecialists = ALL_SPECIALISTS.filter((s) =>
    s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartConsult = async () => {
    if (!selectedSpecialist) return;
    
    if (localStorage.getItem('isAuthenticated') !== 'true') {
      window.dispatchEvent(new CustomEvent('hc_require_auth', { 
        detail: { 
          title: 'Authentication Required', 
          message: 'You need to log in or sign up to start a specialized consultation.' 
        } 
      }));
      return;
    }

    setPhase('upload'); // Modified to correctly go to upload phase!
  };

  
  const handleSkipUpload = () => {
    setPhase('chat');
  };

  const handleProceedWithUpload = () => {
    // If files were uploaded, we'll pass them as context via symptomInput
    if (uploadedFiles.length > 0) {
      const fileNames = uploadedFiles.map(f => f.name).join(', ');
      setSymptomInput(prev => prev ? prev + ' [Attached reports: ' + fileNames + ']' : '[Attached reports: ' + fileNames + ']');
    }
    setPhase('chat');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = async (id: string, messages: any[]) => {
    if (completionHandledRef.current) return;
    completionHandledRef.current = true;
    setFinalTranscripts({ [id]: messages });
    setPhase('compiling');
    completionTimerRef.current = setTimeout(() => setPhase('done'), 10000);
    
    const caseTitle = `Quick Consult: ${selectedSpecialist?.label || 'Specialist'}`;
    const newCase = createCaseDraft({
      title: caseTitle,
      intakeData: { chiefComplaint: symptomInput || "Quick consult completed" },
      specialists: [selectedSpecialist?.label || 'General']
    });
    setActiveCase(newCase);
    
    // We must use newCase directly because activeCase hasn't updated in this closure yet
    if (newCase) {
      const aiMessages = messages.filter(m => m.role === 'ai' && !m.text.includes('ANALYSIS_COMPLETE'));
      const summaryMessage = aiMessages[aiMessages.length - 1];
      let reportData: any = {
        executiveSummary: "Assessment completed by " + (selectedSpecialist?.label || 'Specialist'),
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
                     reportData.executiveSummary = parsed.patientFriendlySummary || parsed.internalThoughts || reportData.executiveSummary;
                     reportData.topDiagnoses = parsed.currentHypotheses.map((h: any) => 
                         typeof h === 'string' ? { condition: h, confidence: 50 } : { condition: h.condition, rationale: h.rationale, confidence: 50 }
                     );
                 }
                 if (parsed.keyFindings) reportData.keyFindings = parsed.keyFindings;
                 if (parsed.interpretation) reportData.interpretation = parsed.interpretation;
                 if (parsed.nextSteps) reportData.nextSteps = parsed.nextSteps;
                 if (parsed.abnormalitiesNoted) reportData.abnormalitiesNoted = parsed.abnormalitiesNoted;
                 if (parsed.medicalTerms) reportData.medicalTerms = parsed.medicalTerms;
             }
         }
      } catch(e) {}
      
      const savedCase = saveReviewSnapshot({
        caseId: newCase.id,
        type: 'parallel',
        report: reportData,
        transcripts: { [id]: messages },
        specialists: [selectedSpecialist.label],
        basedOnEvidenceIds: []
      });
      // Keep the workflow view aligned with the canonical My Cases object;
      // otherwise a refresh during the completion phase can restore a draft
      // case from sessionStorage without its saved review.
      setActiveCase(savedCase);
    }
  };

  useEffect(() => {
    // SECURITY: Prevent unauthenticated users from bypassing the auth wall via sessionStorage phase restoring.
    if (phase !== 'select' && localStorage.getItem('isAuthenticated') !== 'true') {
      setPhase('select');
    }
  }, [phase]);

  useEffect(() => {    // Default select GP if available
    if (phase === 'select' && !selectedSpecialist && !searchQuery) {
      const gp = ALL_SPECIALISTS.find(s => s.id === 'gp');
      if (gp) setSelectedSpecialist(gp);
    }
  }, [phase, selectedSpecialist, searchQuery]);

  return (
    <div style={{ maxWidth: isMobile ? '100%' : '800px', margin: '0 auto', paddingBottom: '40px', marginTop: isMobile ? '0' : '-8px', position: 'relative', zIndex: 1 }}>
      
      <AnimatePresence mode="wait">
        {phase === 'select' && (
          <motion.div
            initial={{ opacity: 0, y: 20, backgroundPosition: '0% 50%' }}
            animate={{ 
              opacity: 1, 
              y: 0,
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
            }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
              backgroundPosition: {
                duration: 10,
                ease: "linear",
                repeat: Infinity
              }
            }}
            style={{
              background: 'linear-gradient(120deg, rgba(240, 253, 244, 0.2) 0%, rgba(239, 246, 255, 0.2) 50%, rgba(255, 255, 255, 0.3) 100%)',
              backgroundSize: '200% 200%',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              padding: isMobile ? '20px' : '24px 48px 48px',
              borderRadius: '32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    padding: '6px 12px',
                    background: 'rgba(255, 255, 255, 0.25)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '999px',
                    border: '1px solid rgba(0,0,0,0.05)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                  }}
                >
                  <Stethoscope size={14} color="#3B82F6" />
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#334155',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    Quick Consult
                  </span>
                </div>
                <h2 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 900, color: '#0F172A', margin: '0 0 8px 0', letterSpacing: '-.5px' }}>
                  Which AI clinical perspective would you like to explore?
                </h2>
                <p style={{ color: '#64748B', fontSize: '15px', margin: 0, fontWeight: 500 }}>
                  Choose an AI perspective to help organize questions for your clinicianâ€”not a consultation with a licensed professional.
                </p>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Choose an AI Perspective
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
                      background: 'rgba(255, 255, 255, 0.2)'
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
                        borderRadius: '16px',
                        border: `1px solid ${isSelected ? '#3B82F6' : 'rgba(255, 255, 255, 0.2)'}`,
                        background: isSelected 
                          ? 'rgba(239, 246, 255, 0.85)' 
                          : 'rgba(255, 255, 255, 0.4)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        boxShadow: isSelected 
                          ? '0 12px 24px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255,255,255,1)' 
                          : '0 4px 12px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                      }}
                      onMouseOver={(e) => { 
                        if (!isSelected) { 
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'; 
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; 
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)';
                        } 
                      }}
                      onMouseOut={(e) => { 
                        if (!isSelected) { 
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'; 
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)'; 
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255, 255, 255, 0.25)';
                        } 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '12px' }}>
                        <div 
                          style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '12px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            background: `linear-gradient(135deg, ${s.bg} 0%, ${s.bg}80 100%)`, 
                            color: s.color,
                            boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.25), 0 2px 6px rgba(0,0,0,0.04)'
                          }}
                        >
                          <Icon size={20} />
                        </div>
                        {/* Sparkle Indicator */}
                        <div style={{ 
                          opacity: isSelected ? 1 : 0.5, 
                          transition: 'opacity 0.2s, transform 0.2s', 
                          filter: isSelected ? 'drop-shadow(0 2px 4px rgba(168,85,247,0.4))' : 'grayscale(100%) opacity(50%)',
                          transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                        }}>
                           <Sparkles size={14} color="#A855F7" />
                        </div>
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
                  disabled={!selectedSpecialist}
                  style={{
                    padding: '16px 32px',
                    background: selectedSpecialist ? '#0F172A' : '#E2E8F0',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '999px',
                    fontWeight: 700,
                    fontSize: '16px',
                    cursor: selectedSpecialist ? 'pointer' : 'not-allowed',
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


        {phase === 'upload' && selectedSpecialist && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(24px)',
              padding: isMobile ? '32px 20px' : '40px 56px',
              borderRadius: '32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              maxWidth: '560px',
              margin: '0 auto',
              textAlign: 'center'
            }}
          >
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #6366F1, #A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <FileUp size={32} color="#FFF" />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', margin: '0 0 8px' }}>
              Have any existing reports?
            </h2>
            <p style={{ color: '#64748B', fontSize: '15px', margin: '0 0 32px', lineHeight: 1.5 }}>
              Upload lab results, imaging reports, or previous prescriptions. This helps the {selectedSpecialist.label} AI ask better, more targeted questions.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '14px 24px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '2px dashed #CBD5E1',
                  borderRadius: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#475569',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.color = '#6366F1'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#475569'; }}
              >
                <Upload size={18} /> Upload Files
              </button>
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.capture = 'environment';
                  input.onchange = (e: any) => {
                    if (e.target.files) setUploadedFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
                  };
                  input.click();
                }}
                style={{
                  padding: '14px 24px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '2px dashed #CBD5E1',
                  borderRadius: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#475569',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.color = '#6366F1'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#475569'; }}
              >
                <Image size={18} /> Take Photo
              </button>
            </div>

            {uploadedFiles.length > 0 && (
              <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {uploadedFiles.map((file, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#F0FDF4', borderRadius: 12, border: '1px solid #BBF7D0' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                      {file.name}
                    </span>
                    <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: 4 }}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={handleSkipUpload}
                style={{
                  padding: '14px 28px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#64748B',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = '#0F172A'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = '#64748B'; }}
              >
                Skip for now
              </button>
              {uploadedFiles.length > 0 && (
                <button
                  onClick={handleProceedWithUpload}
                  style={{
                    padding: '14px 28px',
                    background: '#0F172A',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: 999,
                    cursor: 'pointer',
                    fontSize: 15,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s'
                  }}
                >
                  Continue with {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} <ArrowRight size={16} />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {phase === 'chat' && selectedSpecialist && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              padding: isMobile ? '20px' : '24px 48px 48px',
              borderRadius: '32px',
              boxShadow: '0 8px 32px rgba(31, 38, 135, 0.05), inset 0 1px 0 rgba(255, 255, 255, 1)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              height: isMobile ? 'calc(100dvh - 120px)' : '700px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '12px', background: selectedSpecialist.bg, color: selectedSpecialist.color, display: 'grid', placeItems: 'center' }}>
                  <selectedSpecialist.icon size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{selectedSpecialist.label}</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>AI-guided question preparation</p>
                </div>
              </div>
              <button 
                onClick={resetConsult}
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
            
            <div style={{ margin: isMobile ? '0 -20px -20px -20px' : '0 -48px -48px -48px', flex: 1, display: 'flex', minHeight: 0 }}>
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
                workflow="quick-consult"
                caseId={activeCase?.id || 'draft'}
                runId={sessionStorage.getItem('hc_qc_run_id') || 'session'}
              />
            </div>
          </motion.div>
        )}

          {phase === 'compiling' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              style={{
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(24px)',
                padding: isMobile ? '32px 16px' : '32px 64px 64px',
                borderRadius: '32px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                maxWidth: '600px',
                margin: '0 auto',
              }}
            >
              <CompilingAnimation isDark={false} />
            </motion.div>
          )}

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
              textAlign: 'center'
            }}
          >
            <div style={{ width: 64, height: 64, background: '#DCFCE7', color: '#16A34A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
              <ShieldCheck size={32} />
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', marginBottom: '8px' }}>Assessment Complete</h2>
            <p style={{ color: '#64748B', fontSize: '16px', marginBottom: '40px', maxWidth: '400px', margin: '0 auto 40px auto' }}>
              Your AI-guided {selectedSpecialist?.label} perspective has been saved to your case for clinician discussion.
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
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.25)', fontWeight: 500 }}>Organize multiple AI perspectives for your next clinician visit</div>
                  </div>
                </div>
                <ChevronRight size={20} />
              </button>

              <button 
                onClick={resetConsult}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'transparent',
                  border: 'none',
                  fontWeight: 700,
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  marginTop: '8px'
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = '#0F172A'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = '#64748B'; }}
              >
                Start another consult
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

