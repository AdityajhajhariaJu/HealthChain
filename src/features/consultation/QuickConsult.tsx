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
  FileUp,
  Loader2
} from 'lucide-react';
import { ALL_SPECIALISTS } from '../../data/specialists';
import { SpecialistPanel } from '../mdt/MultiSpecialistComponents';
import { createCaseDraft, getCase, saveReviewSnapshot, updateCaseConnectionMap } from '../../services/CaseEngine';
import { generateCaseConnectionMap, parseModelJson, analyzeLabReport } from '../../services/geminiService';
import { getProfile } from '../../services/ProfileEngine';
import { CaseConnectionMap } from '../../components/ui/CaseConnectionMap';
import { useIsMobile } from '../../hooks/useIsMobile';
import { CompilingAnimation } from '../../components/ui/CompilingAnimation';
import { getRunScope, clearRunStorage, makeRunId } from '../../services/RunContext';
import { getActiveSession } from '../../services/authSession';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { trackConsultationStarted } from '../../services/analytics';
import { canUseTrial, recordTrialUsage, openTrialModal } from '../../services/TrialEngine';
import { useToast } from '../../components/ui/ToastProvider';

const cachedQuickConsultStreams: any = {};
// Resolve these at use-time rather than module import so a profile/account
// switch cannot reuse the previous user's transient consultation draft.
const getQuickPhaseKey = () => getRunScope('quick-consult', 'draft', 'phase');
const getQuickSpecialistKey = () => getRunScope('quick-consult', 'draft', 'specialist');
const getQuickCaseKey = () => getRunScope('quick-consult', 'draft', 'case');
const getQuickRunIdKey = () => getRunScope('quick-consult', 'draft', 'run-id');

export default function QuickConsult() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const toast = useToast();
  const [phase, setPhase] = useState<'select' | 'upload' | 'chat' | 'compiling' | 'done'>(() => {
    return (sessionStorage.getItem(getQuickPhaseKey()) as any) || 'select';
  });
  const [selectedSpecialist, setSelectedSpecialist] = useState<any>(() => {
    const savedId = sessionStorage.getItem(getQuickSpecialistKey());
    return savedId ? ALL_SPECIALISTS.find(s => s.id === savedId) || null : null;
  });
  const [symptomInput, setSymptomInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [finalTranscripts, setFinalTranscripts] = useState<any>({});
  const [quickRunId, setQuickRunId] = useState(() => {
    const saved = sessionStorage.getItem(getQuickRunIdKey());
    if (saved) return saved;
    const next = makeRunId();
    sessionStorage.setItem(getQuickRunIdKey(), next);
    return next;
  });
  const [activeCase, setActiveCase] = useState<any>(() => {
    try {
      const saved = sessionStorage.getItem(getQuickCaseKey());
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.id ? getCase(parsed.id) || parsed : null;
    } catch {
      sessionStorage.removeItem(getQuickCaseKey());
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
    const nextRunId = makeRunId();
    setQuickRunId(nextRunId);
    sessionStorage.setItem(getQuickRunIdKey(), nextRunId);
    sessionStorage.removeItem(getQuickPhaseKey());
    sessionStorage.removeItem(getQuickSpecialistKey());
    sessionStorage.removeItem(getQuickCaseKey());
  };

  useEffect(() => {
    const handleProfileChange = () => resetConsult();
    window.addEventListener('hc_profile_updated', handleProfileChange);
    window.addEventListener('hc_logout', handleProfileChange);
    return () => {
      window.removeEventListener('hc_profile_updated', handleProfileChange);
      window.removeEventListener('hc_logout', handleProfileChange);
    };
  }, []);

  const findSpecialistForSymptom = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes('headache') || t.includes('migraine') || t.includes('dizzy') || t.includes('dizziness') || t.includes('brain fog') || t.includes('vertigo') || t.includes('memory') || t.includes('seizure') || t.includes('tingling') || t.includes('numbness')) {
      return ALL_SPECIALISTS.find(s => s.id === 'neuro');
    }
    if (t.includes('heart') || t.includes('palpitation') || t.includes('chest') || t.includes('bp') || t.includes('pressure') || t.includes('pulse') || t.includes('tachycardia') || t.includes('cardio') || t.includes('pots')) {
      return ALL_SPECIALISTS.find(s => s.id === 'cardio');
    }
    if (t.includes('gut') || t.includes('bloat') || t.includes('stomach') || t.includes('bowel') || t.includes('ibs') || t.includes('sibo') || t.includes('acid') || t.includes('reflux') || t.includes('digest') || t.includes('constipat') || t.includes('diarrhea') || t.includes('nausea')) {
      return ALL_SPECIALISTS.find(s => s.id === 'gastro');
    }
    if (t.includes('fatigue') || t.includes('thyroid') || t.includes('hormone') || t.includes('adrenal') || t.includes('t3') || t.includes('t4') || t.includes('tsh') || t.includes('cortisol') || t.includes('glucose') || t.includes('diabetes') || t.includes('weight')) {
      return ALL_SPECIALISTS.find(s => s.id === 'endo');
    }
    if (t.includes('breath') || t.includes('cough') || t.includes('lung') || t.includes('asthma') || t.includes('dyspnea') || t.includes('wheez')) {
      return ALL_SPECIALISTS.find(s => s.id === 'pulmo');
    }
    if (t.includes('joint') || t.includes('arthritis') || t.includes('autoimmun') || t.includes('lupus') || t.includes('inflammation') || t.includes('mcas') || t.includes('ana') || t.includes('esr') || t.includes('crp')) {
      return ALL_SPECIALISTS.find(s => s.id === 'rheum');
    }
    if (t.includes('rash') || t.includes('skin') || t.includes('eczema') || t.includes('hives') || t.includes('acne') || t.includes('itch')) {
      return ALL_SPECIALISTS.find(s => s.id === 'derm');
    }
    if (t.includes('allerg') || t.includes('histamine') || t.includes('sinus') || t.includes('sneez')) {
      return ALL_SPECIALISTS.find(s => s.id === 'allergy');
    }
    if (t.includes('ear') || t.includes('throat') || t.includes('tinnitus') || t.includes('hearing') || t.includes('swallow')) {
      return ALL_SPECIALISTS.find(s => s.id === 'ent');
    }
    if (t.includes('eye') || t.includes('vision') || t.includes('blur') || t.includes('sight')) {
      return ALL_SPECIALISTS.find(s => s.id === 'ophthal');
    }
    if (t.includes('back') || t.includes('neck') || t.includes('spine') || t.includes('posture') || t.includes('muscle')) {
      return ALL_SPECIALISTS.find(s => s.id === 'physio');
    }
    if (t.includes('anxiety') || t.includes('depress') || t.includes('panic') || t.includes('sleep') || t.includes('insomnia') || t.includes('stress')) {
      return ALL_SPECIALISTS.find(s => s.id === 'psych');
    }
    return ALL_SPECIALISTS.find(s => s.id === 'gp') || ALL_SPECIALISTS[0];
  };

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      resetConsult();
      let specToUse: any = null;
      const presetSpecId = sessionStorage.getItem('hc_preset_specialist');
      if (presetSpecId) {
        specToUse = ALL_SPECIALISTS.find(s => s.id === presetSpecId) || null;
        sessionStorage.removeItem('hc_preset_specialist');
      }
      const preset = sessionStorage.getItem('hc_preset_symptom');
      if (preset) {
        setSymptomInput(preset);
        sessionStorage.removeItem('hc_preset_symptom');
        if (!specToUse) {
          specToUse = findSpecialistForSymptom(preset);
        }
      }

      if (specToUse) {
        setSelectedSpecialist(specToUse);
        setPhase('chat');
      } else {
        setPhase('select');
      }
      searchParams.delete('new');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => { sessionStorage.setItem(getQuickPhaseKey(), phase); }, [phase]);
  useEffect(() => {
    if (selectedSpecialist) sessionStorage.setItem(getQuickSpecialistKey(), selectedSpecialist.id);
    else sessionStorage.removeItem(getQuickSpecialistKey());
  }, [selectedSpecialist]);
  useEffect(() => {
    if (activeCase) sessionStorage.setItem(getQuickCaseKey(), JSON.stringify(activeCase));
    else sessionStorage.removeItem(getQuickCaseKey());
  }, [activeCase]);

  const filteredSpecialists = ALL_SPECIALISTS.filter((s) =>
    s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartConsult = async () => {
    if (!selectedSpecialist) return;
    
    const session = await getActiveSession();
    if (!session) {
      if (!canUseTrial('quick_consult')) {
        window.dispatchEvent(new CustomEvent('hc_require_auth', { 
          detail: { 
            title: 'Free Consultation Limit Reached', 
            message: 'You have used your 1 free guest consultation. Please log in or sign up to continue and save your medical cases.' 
          } 
        }));
        return;
      }
    } else {
      if (!canUseTrial('quick_consult')) {
        openTrialModal('Quick Consult (1 Free Trial Session)');
        return;
      }
    }

    setPhase('upload');
  };

  
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

  const handleSkipUpload = () => {
    trackConsultationStarted('quick', { specialist: selectedSpecialist?.name, hasFiles: false });
    setPhase('chat');
  };

  const handleProceedWithUpload = async () => {
    if (uploadedFiles.length > 0) {
      setIsProcessingFiles(true);
      try {
        let extractedContext = '';
        const profile = getProfile() || {};
        for (const file of uploadedFiles) {
          const reader = new FileReader();
          const base64Data = await new Promise<string>((resolve) => {
            reader.onload = (e) => resolve((e.target?.result as string).split(',')[1] || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
          if (base64Data) {
            const result = await analyzeLabReport(base64Data, file.type, profile);
            if (result) {
              extractedContext += `\n\n--- Document: ${file.name} ---\n`;
              extractedContext += `Test/Report Type: ${result.testName || 'Lab Report'}\n`;
              extractedContext += `Key Findings: ${result.keyFindings || 'Findings extracted'}\n`;
              if (result.interpretation) extractedContext += `Interpretation: ${result.interpretation}\n`;
            }
          }
        }
        if (extractedContext) {
          setSymptomInput(prev => (prev ? prev + extractedContext : extractedContext.trim()));
        } else {
          const fileNames = uploadedFiles.map(f => f.name).join(', ');
          setSymptomInput(prev => prev ? prev + ' [Attached reports: ' + fileNames + ']' : '[Attached reports: ' + fileNames + ']');
        }
      } catch (err) {
        console.error('Error parsing files in Quick Consult:', err);
        const fileNames = uploadedFiles.map(f => f.name).join(', ');
        setSymptomInput(prev => prev ? prev + ' [Attached reports: ' + fileNames + ']' : '[Attached reports: ' + fileNames + ']');
      } finally {
        setIsProcessingFiles(false);
      }
    }
    trackConsultationStarted('quick', { specialist: selectedSpecialist?.name, hasFiles: uploadedFiles.length > 0 });
    setPhase('chat');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      const valid: File[] = [];

      for (const file of selected) {
        if (file.size === 0) {
          toast.error('Invalid File', `File "${file.name}" is empty.`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error('File Too Large', `"${file.name}" exceeds the 5MB size limit.`);
          continue;
        }
        if (!ALLOWED.includes(file.type)) {
          toast.error('Unsupported Format', `"${file.name}" must be a PDF or image (JPEG/PNG/WEBP).`);
          continue;
        }
        valid.push(file);
      }

      if (uploadedFiles.length + valid.length > 5) {
        toast.error('Limit Exceeded', 'You can upload up to 5 documents per consultation.');
        return;
      }

      setUploadedFiles(prev => [...prev, ...valid]);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      const summaryMessage = messages.find(m => m.role === 'ai' && m.text.includes('ANALYSIS_COMPLETE'))
        || messages.filter(m => m.role === 'ai').pop();
      let reportData: any = {
        executiveSummary: "Assessment completed by " + (selectedSpecialist?.label || 'Specialist'),
        topDiagnoses: [],
        recommendedActionPlan: []
      };
      
      try {
         if (summaryMessage && summaryMessage.text.includes('{')) {
             const parsed = parseModelJson<any>(summaryMessage.text);
             if (parsed) {
                 if (parsed.currentHypotheses) {
                     reportData.executiveSummary = parsed.patientFriendlySummary || parsed.evidenceNote || reportData.executiveSummary;
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
        specialists: [selectedSpecialist?.label || 'General'],
        basedOnEvidenceIds: []
      });
      // Keep the workflow view aligned with the canonical My Cases object;
      // otherwise a refresh during the completion phase can restore a draft
      // case from sessionStorage without its saved review.
      setActiveCase(savedCase);
      awardPoints(5, `Quick Consult: ${selectedSpecialist?.label || 'Specialist'}`, 'consult');
      recordTrialUsage('quick_consult');

      // Fire and forget: Generate connection map
      generateCaseConnectionMap(reportData.topDiagnoses || []).then((mapData) => {
        if (mapData) updateCaseConnectionMap(savedCase.id, mapData);
      }).catch(err => console.error("Failed to generate connection map:", err));
    }
  };

  useEffect(() => {
    // SECURITY: Prevent unauthenticated users who already used their trial from bypassing via sessionStorage.
    let cancelled = false;
    getActiveSession().then((session) => {
      if (!cancelled && phase !== 'select' && !session) {
        if (!canUseTrial('quick_consult')) {
          setPhase('select');
        }
      }
    });
    return () => { cancelled = true; };
  }, [phase]);

  useEffect(() => {    // Default select GP if available
    if (phase === 'select' && !selectedSpecialist && !searchQuery) {
      const gp = ALL_SPECIALISTS.find(s => s.id === 'gp');
      if (gp) setSelectedSpecialist(gp);
    }
  }, [phase, selectedSpecialist, searchQuery]);

  return (
    <div style={{ maxWidth: isMobile ? '100%' : '800px', margin: '0 auto', paddingBottom: '0px', marginTop: isMobile ? '0' : '-8px', position: 'relative', zIndex: 1 }}>
      
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
              background: '#FFFFFF',
              padding: isMobile ? '20px' : '24px 48px 48px',
              borderRadius: '32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
              border: '1px solid #E2E8F0',
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
                <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0', letterSpacing: '-.5px' }}>
                  Which AI clinical perspective would you like to explore?
                </h2>
                <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>
                  Choose an AI perspective to help organize questions for your clinician—not a consultation with a licensed professional.
                </p>
              </div>
            </div>

            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
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
                      background: '#F8FAFC'
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
                        width: '120px',
                        padding: '12px',
                        borderRadius: '16px',
                        border: `1.5px solid ${isSelected ? '#FDBA74' : '#E2E8F0'}`,
                        background: isSelected 
                          ? '#FFF9F0' 
                          : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        boxShadow: isSelected 
                          ? '0 8px 16px rgba(253, 186, 116, 0.15)' 
                          : '0 2px 6px rgba(0,0,0,0.02)'
                      }}
                      onMouseOver={(e) => { 
                        if (!isSelected) { 
                          e.currentTarget.style.borderColor = '#CBD5E1'; 
                          e.currentTarget.style.background = '#F8FAFC'; 
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.04)';
                        } 
                      }}
                      onMouseOut={(e) => { 
                        if (!isSelected) { 
                          e.currentTarget.style.borderColor = '#E2E8F0'; 
                          e.currentTarget.style.background = '#FFFFFF'; 
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)';
                        } 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '12px' }}>
                        <div 
                          style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '10px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            background: isSelected ? 'linear-gradient(135deg, #FDBA74 0%, #FED7AA 100%)' : s.bg, 
                            color: isSelected ? '#9A3412' : s.color,
                            boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.25), 0 2px 6px rgba(0,0,0,0.04)'
                          }}
                        >
                          <Icon size={16} />
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
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>{s.label}</h4>
                      <p style={{ margin: 0, fontSize: '10px', color: '#64748B', lineHeight: 1.3 }}>{s.desc}</p>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleStartConsult}
                  disabled={!selectedSpecialist}
                  style={{
                    padding: '12px 24px',
                    background: selectedSpecialist ? '#0F172A' : '#E2E8F0',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '99px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: selectedSpecialist ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                  }}
                >
                  Start Consult <ArrowRight size={16} />
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
              background: '#FFFFFF',
              padding: isMobile ? '32px 20px' : '40px 56px',
              borderRadius: '32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
              border: '1px solid #E2E8F0',
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
                  background: '#F8FAFC',
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
                  background: '#F8FAFC',
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
              <div style={{ marginBottom: 24, textAlign: 'left', background: '#F8FAFC', padding: '12px 16px', borderRadius: 16, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Attached Records:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {uploadedFiles.map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#64748B' }}>
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '280px' }}>{f.name}</span>
                      <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 2 }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setPhase('chat')}
                style={{
                  padding: '14px 28px',
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 600,
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = '#0F172A'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = '#64748B'; }}
              >
                Skip this step
              </button>
              {uploadedFiles.length > 0 && (
                <button
                  onClick={handleProceedWithUpload}
                  disabled={isProcessingFiles}
                  style={{
                    padding: '14px 28px',
                    background: isProcessingFiles ? '#64748B' : '#0F172A',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: 999,
                    cursor: isProcessingFiles ? 'not-allowed' : 'pointer',
                    fontSize: 15,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s'
                  }}
                >
                  {isProcessingFiles ? <Loader2 size={16} className="spin" /> : null}
                  {isProcessingFiles ? 'Extracting Lab Findings...' : `Continue with ${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''}`}
                  {!isProcessingFiles && <ArrowRight size={16} />}
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
              background: '#FFFFFF',
              padding: isMobile ? '20px' : '24px 48px 48px',
              borderRadius: '32px',
              boxShadow: '0 8px 32px rgba(31, 38, 135, 0.05)',
              border: '1px solid #E2E8F0',
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
                runId={quickRunId}
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
                background: '#FFFFFF',
                padding: isMobile ? '32px 16px' : '32px 64px 64px',
                borderRadius: '32px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
                border: '1px solid #E2E8F0',
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
              background: '#FFFFFF',
              padding: isMobile ? '32px' : '32px 64px 64px',
              borderRadius: '32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
              border: '1px solid #E2E8F0',
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
                  background: '#F8FAFC',
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
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#F8FAFC'; }}
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

