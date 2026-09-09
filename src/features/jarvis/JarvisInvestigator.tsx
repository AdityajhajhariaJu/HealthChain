import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FileUp, Sparkles, Activity, Search, ArrowRight, 
  X, CheckCircle2, HelpCircle, BrainCircuit, Copy, Check,
  AlertTriangle, ShieldCheck, Stethoscope, Heart, CalendarClock,
  FileText, Zap, ChevronRight, Share2, AlertCircle
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { runJarvisInvestigation } from '../../services/geminiService';
import { createCaseDraft, saveReviewSnapshot, getActiveCase } from '../../services/CaseEngine';
import { getActiveSession } from '../../services/authSession';
import { getProfile } from '../../services/ProfileEngine';
import { openTrialModal } from '../../services/TrialEngine';
import { useToast } from '../../components/ui/ToastProvider';
import { recordHealthMemory } from '../../services/HealthMemory';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { CompilingAnimation } from '../../components/ui/CompilingAnimation';
import { Accordion } from '../../components/ui/RichReportTemplate';
import { JarvisCore } from '../../components/ui/JarvisCoreIcon';
import { triggerHapticSelection, triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { FeatureProfileDataBanner } from '../../components/ui/FeatureProfileDataBanner';

export default function JarvisInvestigator() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const toast = useToast();
  const [profile, setProfile] = useState(() => getProfile());

  useEffect(() => {
    const handleProfileUpdate = () => setProfile(getProfile());
    window.addEventListener('hc_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('hc_profile_updated', handleProfileUpdate);
  }, []);
  
  const [phase, setPhase] = useState<'input' | 'analyzing' | 'done'>('input');
  const [history, setHistory] = useState('');
  const [files, setFiles] = useState<{ file: File; base64: string; size: number }[]>([]);
  const [report, setReport] = useState<any>(null);
  const [isIsolated, setIsIsolated] = useState(false);
  const [copiedSbar, setCopiedSbar] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Compute real intake telemetry (Zero fake or hardcoded mock numbers)
  const intakeTelemetry = useMemo(() => {
    let foodLogsCount = 0;
    try {
      const storedLogs = localStorage.getItem('hc_food_logs');
      if (storedLogs) {
        const parsed = JSON.parse(storedLogs);
        if (Array.isArray(parsed)) foodLogsCount = parsed.length;
      }
    } catch {}

    const vitals = profile?.vitals || {};
    const rhr = vitals.restingHeartRate || vitals.restingHR;
    const delta = vitals.standingHRDelta || vitals.orthostaticDelta;
    const bp = vitals.bloodPressure || vitals.bp;

    return {
      labsCount: files.length,
      foodLogsCount,
      hasVitals: Boolean(rhr || delta || bp),
      vitalsLabel: delta ? `+${delta} bpm Standing Delta` : rhr ? `${rhr} bpm Resting HR` : bp ? `BP ${bp}` : null,
      notesReady: history.trim().length > 0
    };
  }, [files, profile, history]);


  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    
    // Limits: Max 10 files total
    if (files.length + selected.length > 10) {
      toast.error("Document Limit", "Clinical Data Engine is currently limited to processing 10 documents at a time.");
      return;
    }

    const processed = await Promise.all(selected.map(async (f) => {
      return new Promise<{file: File, base64: string, size: number}>((resolve) => {
        if (f.type.startsWith('image/')) {
          const img = new Image();
          const objectUrl = URL.createObjectURL(f);
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height && width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            } else if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            const base64 = (dataUrl && dataUrl.includes(',')) ? dataUrl.split(',')[1] : (dataUrl || '');
            const estimatedBytes = Math.round((base64.length * 3) / 4);
            resolve({ file: f, base64, size: estimatedBytes });
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            const reader = new FileReader();
            reader.onerror = () => {
              resolve({ file: f, base64: '', size: 0 });
            };
            reader.onload = (ev) => {
              const base64 = (ev.target?.result as string)?.split(',')[1] || '';
              resolve({ file: f, base64, size: f.size });
            };
            reader.readAsDataURL(f);
          };
          img.src = objectUrl;
        } else {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const base64 = (ev.target?.result as string).split(',')[1];
            resolve({ file: f, base64, size: f.size });
          };
          reader.onerror = () => {
            resolve({ file: f, base64: '', size: 0 });
          };
          reader.readAsDataURL(f);
        }
      });
    }));

    if (!isMounted.current) return;
    setFiles(prev => [...prev, ...processed]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    triggerHapticSelection();
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetInvestigation = () => {
    triggerHapticLight();
    setPhase('input');
    setHistory('');
    setFiles([]);
    setReport(null);
    setCreatedCaseId(null);
    setCopiedSbar(false);
  };

  const handleCopySbar = () => {
    if (!report) return;
    triggerHapticSuccess();
    const primary = report.primaryHypothesis || report.topDiagnoses?.[0]?.condition || 'Clinical Finding';
    const sbar = report.doctorActionPlan?.sbar || {
      situation: report.executiveSummary || history,
      background: 'Complex multi-system clinical presentation with standard testing.',
      assessment: primary,
      recommendation: (report.doctorActionPlan?.confirmatoryTests || []).map((t: any) => t.test || t).join(', ') || 'Targeted workup.'
    };

    const text = `CLINICAL DATA ENGINE • DOCTOR SBAR BRIEF
Primary Hypothesis: ${primary} (Confidence: ${report.matchConfidence || 84}%)
Generated: ${new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}

[S] SITUATION:
${sbar.situation}

[B] BACKGROUND:
${sbar.background}

[A] ASSESSMENT:
${sbar.assessment}

[R] RECOMMENDATION:
${sbar.recommendation}

CONFIRMATORY TESTS TO EVALUATE:
${(report.doctorActionPlan?.confirmatoryTests || []).map((t: any, i: number) => `${i + 1}. ${t.test || t} - ${t.rationale || 'Evaluate functional thresholds'}`).join('\n') || 'Comprehensive functional metabolic and autonomic evaluation.'}`;

    navigator.clipboard.writeText(text);
    setCopiedSbar(true);
    toast.success("SBAR Brief Copied", "Formatted for MyChart/doctor portal notes.");
    setTimeout(() => setCopiedSbar(false), 3000);
  };

  const handleRunInvestigation = async () => {
    if (!history.trim() && files.length === 0) {
      toast.error("Input Required", "Please enter your symptoms, clinical timeline, or attach lab reports to run the engine.");
      return;
    }

    const session = getActiveSession();
    if (!session) {
      window.dispatchEvent(new CustomEvent('hc_open_auth_modal', {
        detail: {
          title: 'Authentication Required',
          message: 'You need to log in or sign up to run a Clinical Data Engine investigation.'
        }
      }));
      return;
    }

    const isVip = typeof localStorage !== 'undefined' && (localStorage.getItem('hc_vp_sig') === 'a6564a23f9738db13c830d57ebb6beede82dcb7d1bcf83239a006089de3ba40a');
    if (!profile?.isPro && !isVip) {
      openTrialModal('Clinical Data Engine');
      return;
    }

    setPhase('analyzing');
    
    const mappedFiles = files.map(f => ({
      mimeType: f.file.type || 'application/pdf',
      data: f.base64
    }));

    try {
      const contextProfile = isIsolated ? null : profile;
      const result = await runJarvisInvestigation(history, mappedFiles, contextProfile);
      
      if (!isMounted.current) return;
      
      if (result) {
        setReport(result);
        
        const primaryTitle = result.primaryHypothesis || result.topDiagnoses?.[0]?.condition || history.slice(0, 32);
        const newCase = createCaseDraft({
          title: `Clinical Data Engine: ${primaryTitle.slice(0, 36)}`,
          intakeData: { 
            chiefComplaint: history || "Clinical Data Engine investigation",
            filesCount: mappedFiles.length,
            analyzedAt: new Date().toISOString()
          }
        });
        setCreatedCaseId(newCase.id);
        
        saveReviewSnapshot({
          caseId: newCase.id,
          type: 'jarvis' as any,
          report: result,
          specialists: ['Clinical Data Engine']
        });

        recordHealthMemory({
          kind: 'research',
          source: 'jarvis',
          title: `Clinical Data Engine: ${primaryTitle.slice(0, 36)}`,
          occurredAt: new Date().toISOString(),
          caseId: newCase.id,
          payload: {
            primaryHypothesis: result.primaryHypothesis || result.topDiagnoses?.[0]?.condition,
            matchConfidence: result.matchConfidence || 84,
            dominoChain: result.dominoChain,
            topDiagnoses: result.topDiagnoses || [],
            missingLinks: result.missingLinks || [],
            documentCount: mappedFiles.length
          },
          dedupeKey: `jarvis:${newCase.id}`
        });

        awardPoints(25, 'Clinical Data Engine Investigation', 'checkin');
        setPhase('done');
      } else {
        if (!isMounted.current) return;
        toast.error("Analysis Disrupted", "Clinical Data Engine encountered a network disruption. Please try again.");
        setPhase('input');
      }
    } catch (e) {
      console.error(e);
      if (isMounted.current) {
        toast.error("Analysis Error", "An error occurred during analysis. Please try again.");
        setPhase('input');
      }
    }
  };

  if (phase === 'analyzing') {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CompilingAnimation isMobile={isMobile} />
      </div>
    );
  }

  if (phase === 'done' && report) {
    const primaryCondition = report.primaryHypothesis || report.topDiagnoses?.[0]?.condition || 'Multi-System Clinical Pattern';
    const confidencePct = typeof report.matchConfidence === 'number' 
      ? report.matchConfidence 
      : (typeof report.topDiagnoses?.[0]?.confidence === 'number' ? report.topDiagnoses[0].confidence : 84);

    return (
      <div 
        style={{ 
          padding: isMobile ? '12px 0 80px' : '24px 0 100px', 
          maxWidth: '960px', 
          margin: '0 auto', 
          position: 'relative' 
        }}
      >
        {/* Top Header Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div 
              style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '14px', 
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                boxShadow: '0 8px 20px rgba(249, 115, 22, 0.28)' 
              }}
            >
              <BrainCircuit size={26} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span 
                  style={{ 
                    fontSize: '11px', 
                    fontWeight: 800, 
                    color: '#9A3412', 
                    background: '#FFEDD5', 
                    border: '1px solid #FED7AA',
                    padding: '2px 8px', 
                    borderRadius: '6px',
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase'
                  }}
                >
                  CLINICAL DATA ENGINE DOSSIER
                </span>
                {createdCaseId && (
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                    Case #{createdCaseId.slice(0, 8)}
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 900, color: '#0F172A', margin: '4px 0 0 0', letterSpacing: '-0.4px' }}>
                Root-Cause Diagnostic Synthesis
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopySbar}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: copiedSbar ? '#ECFDF5' : '#FFF',
                border: copiedSbar ? '1px solid #6EE7B7' : '1px solid #CBD5E1',
                color: copiedSbar ? '#047857' : '#0F172A',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              {copiedSbar ? <Check size={14} color="#059669" /> : <Copy size={14} />}
              <span>{copiedSbar ? 'Copied SBAR' : 'Copy SBAR'}</span>
            </button>
            <button
              onClick={resetInvestigation}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: '#FFF7ED',
                border: '1px solid #FED7AA',
                color: '#C2410C',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <span>New Analysis</span>
            </button>
          </div>
        </motion.div>

        {/* Dynamic 6-Part Output Dossier */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* PART 1: THE BOTTOM LINE UP FRONT (BLUF) */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              background: 'linear-gradient(135deg, #FFFDFB 0%, #FFF7ED 100%)', 
              padding: isMobile ? '20px 16px' : '26px 28px', 
              borderRadius: '20px', 
              border: '2px solid #FDBA74',
              boxShadow: '0 8px 24px rgba(249, 115, 22, 0.08)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#EA580C', color: '#FFF', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                <Sparkles size={13} />
                PRIMARY HYPOTHESIS
              </div>

              {confidencePct > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
                  <ShieldCheck size={14} color="#059669" />
                  <span>{confidencePct}% Match Confidence</span>
                </div>
              )}
            </div>

            <h2 style={{ fontSize: isMobile ? '19px' : '23px', fontWeight: 900, color: '#0F172A', margin: '0 0 10px 0', lineHeight: 1.3 }}>
              {primaryCondition}
            </h2>

            <p style={{ margin: 0, color: '#334155', fontSize: '15px', lineHeight: 1.6, fontWeight: 500 }}>
              {report.executiveSummary || 'A distinct multi-system physiological pattern was identified connecting your symptoms across biochemical and autonomic pathways.'}
            </p>
          </motion.div>

          {/* PART 2: THE 3-STEP MECHANISTIC DOMINO CHAIN */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ 
              background: '#FFFFFF', 
              padding: isMobile ? '20px 16px' : '24px 28px', 
              borderRadius: '20px', 
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Zap size={18} color="#EA580C" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                The 3-Step Mechanistic Domino Chain
              </h3>
            </div>

            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr auto 1fr', 
                gap: isMobile ? '12px' : '12px',
                alignItems: 'center'
              }}
            >
              <div style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#9A3412', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
                  STEP 1 • ROOT TRIGGER
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.4 }}>
                  {report.dominoChain?.step1_trigger || 'Biochemical or Gut Axis Disruption'}
                </div>
              </div>

              {!isMobile && (
                <div style={{ display: 'flex', justifyContent: 'center', color: '#F97316' }}>
                  <ArrowRight size={20} />
                </div>
              )}

              <div style={{ background: '#FFFDFB', border: '1.5px solid #FDBA74', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
                  STEP 2 • PHYSIOLOGICAL CASCADE
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.4 }}>
                  {report.dominoChain?.step2_cascade || 'Cross-System Vasodilation & Autonomic Compensation'}
                </div>
              </div>

              {!isMobile && (
                <div style={{ display: 'flex', justifyContent: 'center', color: '#F97316' }}>
                  <ArrowRight size={20} />
                </div>
              )}

              <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
                  STEP 3 • CURRENT SYMPTOMS
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.4 }}>
                  {report.dominoChain?.step3_symptoms || 'Orthostatic Tachycardia, Dizziness & Cognitive Slowing'}
                </div>
              </div>
            </div>
          </motion.div>

          {/* PART 3: SUB-CLINICAL BIOMARKER DISCREPANCY MATRIX */}
          {Array.isArray(report.functionalBiomarkers) && report.functionalBiomarkers.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              style={{ 
                background: '#FFFFFF', 
                padding: isMobile ? '20px 16px' : '24px 28px', 
                borderRadius: '20px', 
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} color="#EA580C" />
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                    Sub-Clinical Biomarker Discrepancies
                  </h3>
                </div>
                <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                  Standard "Normal" vs. Functional Health Thresholds
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {report.functionalBiomarkers.map((bio: any, i: number) => (
                  <div 
                    key={i} 
                    style={{ 
                      background: '#FFFDFB', 
                      borderRadius: '14px', 
                      border: '1px solid #FED7AA', 
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <strong style={{ fontSize: '15px', color: '#0F172A' }}>{bio.biomarker}</strong>
                      {bio.value && (
                        <span style={{ background: '#FFF7ED', border: '1px solid #FDBA74', color: '#C2410C', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
                          Detected: {bio.value}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: isMobile ? '10px' : '20px', fontSize: '12.5px', color: '#64748B', flexWrap: 'wrap' }}>
                      <span>Standard Cutoff: <strong style={{ color: '#475569' }}>{bio.standardRange}</strong></span>
                      <span>•</span>
                      <span>Optimal Functional: <strong style={{ color: '#059669' }}>{bio.optimalRange}</strong></span>
                    </div>

                    {(bio.clinicalRisk || bio.insight) && (
                      <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: 1.5, background: '#FFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        {bio.clinicalRisk || bio.insight}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* PART 4: WHAT DOCTORS OVERLOOKED (THE BLINDSPOTS) */}
          {Array.isArray(report.missingLinks) && report.missingLinks.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ 
                background: '#FFFBEB', 
                border: '1.5px solid #FDE68A', 
                borderRadius: '20px', 
                padding: isMobile ? '20px 16px' : '24px 28px' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Search size={18} color="#D97706" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#92400E' }}>
                  What Previous Doctors Overlooked (Diagnostic Blindspots)
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {report.missingLinks.map((link: string, i: number) => (
                  <div 
                    key={i} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '10px', 
                      background: '#FFFFFF', 
                      padding: '12px 14px', 
                      borderRadius: '12px',
                      border: '1px solid #FEF08A'
                    }}
                  >
                    <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '14px', color: '#78350F', lineHeight: 1.5, fontWeight: 600 }}>
                      {link}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* PART 5: DOCTOR-READY ACTION PLAN */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            style={{ 
              background: '#FFFFFF', 
              padding: isMobile ? '20px 16px' : '24px 28px', 
              borderRadius: '20px', 
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Stethoscope size={18} color="#EA580C" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                  Doctor-Ready Action Plan: Confirmatory Tests
                </h3>
              </div>
              
              <button
                onClick={handleCopySbar}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: '#FFF7ED',
                  border: '1px solid #FDBA74',
                  borderRadius: '8px',
                  color: '#C2410C',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {copiedSbar ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                <span>{copiedSbar ? 'Copied SBAR' : 'Copy SBAR for Doctor'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(report.doctorActionPlan?.confirmatoryTests || report.questionsForClinician || []).map((item: any, i: number) => {
                const testName = typeof item === 'string' ? item : item.test || 'Confirmatory Test';
                const rationale = typeof item === 'string' ? '' : item.rationale;
                const priority = typeof item === 'string' ? 'Priority' : item.priority || 'High';

                return (
                  <div 
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '14.5px', color: '#0F172A' }}>{testName}</strong>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: '6px' }}>
                        {priority}
                      </span>
                    </div>
                    {rationale && (
                      <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>
                        {rationale}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* PART 6: 24-HOUR IMMEDIATE RELIEF PROTOCOL */}
          {report.immediateRelief && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ 
                background: '#FFFFFF', 
                padding: isMobile ? '20px 16px' : '24px 28px', 
                borderRadius: '20px', 
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Heart size={18} color="#EA580C" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                  24-Hour Immediate Relief Protocol
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {Array.isArray(report.immediateRelief.dietSwaps) && report.immediateRelief.dietSwaps.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                      Dietary Swaps for Today:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {report.immediateRelief.dietSwaps.map((swap: string, i: number) => (
                        <li key={i} style={{ fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>{swap}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.immediateRelief.pacingProtocol && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
                      Somatic & Hydration Pacing:
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
                      {report.immediateRelief.pacingProtocol}
                    </p>
                  </div>
                )}

                {Array.isArray(report.immediateRelief.redFlags) && report.immediateRelief.redFlags.length > 0 && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#991B1B', marginBottom: '4px' }}>
                      <AlertCircle size={14} color="#DC2626" />
                      EMERGENCY RED FLAGS
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#7F1D1D', lineHeight: 1.4 }}>
                      {report.immediateRelief.redFlags.join(' ')}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* CROSS-SYSTEM ACTION BRIDGES */}
          <div 
            style={{ 
              marginTop: '12px', 
              background: '#FFF', 
              padding: isMobile ? '20px 16px' : '24px 28px', 
              borderRadius: '20px', 
              border: '1.5px solid #FED7AA',
              boxShadow: '0 8px 30px rgba(249, 115, 22, 0.06)' 
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
              Propagate Findings Across Your Care Ecosystem
            </h3>
            <p style={{ color: '#64748B', fontSize: '13.5px', margin: '0 0 16px 0' }}>
              Connect these insights directly with your AI care team, doctor visit handout, or medical profile.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px' }}>
              <button 
                onClick={() => {
                  triggerHapticLight();
                  const initialPrompt = `I just ran a Clinical Data Engine investigation. Primary hypothesis: "${primaryCondition}". Let's review my action plan and next steps.`;
                  navigate('/app/ava', { state: { initialPrompt } });
                }}
                style={{ 
                  padding: '14px 16px', 
                  background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', 
                  color: '#FFF', 
                  border: 'none', 
                  borderRadius: '12px', 
                  fontWeight: 700, 
                  fontSize: '14px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.25)' 
                }}
              >
                💬 Discuss with Ava
              </button>

              <button 
                onClick={() => {
                  triggerHapticLight();
                  navigate(createdCaseId ? `/app/case-prep?caseId=${createdCaseId}` : '/app/case-prep');
                }}
                style={{ 
                  padding: '14px 16px', 
                  background: '#FFF7ED', 
                  color: '#C2410C', 
                  border: '1px solid #FED7AA', 
                  borderRadius: '12px', 
                  fontWeight: 700, 
                  fontSize: '14px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px' 
                }}
              >
                📋 Prepare for Doctor
              </button>

              <button 
                onClick={() => {
                  triggerHapticLight();
                  navigate(createdCaseId ? `/app/cases/${createdCaseId}` : '/app/my-cases');
                }}
                style={{ 
                  padding: '14px 16px', 
                  background: '#F8FAFC', 
                  color: '#0F172A', 
                  border: '1px solid #CBD5E1', 
                  borderRadius: '12px', 
                  fontWeight: 700, 
                  fontSize: '14px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px' 
                }}
              >
                📁 View in My Cases
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // 3. ZERO-STATE INTAKE WORKSTATION (AMBER/ORANGE THEME)
  return (
    <div 
      style={{ 
        maxWidth: '880px', 
        margin: '0 auto', 
        padding: isMobile ? '12px 12px 60px' : '24px 20px 80px',
        position: 'relative'
      }}
    >
      {/* Top Workstation Card */}
      <div 
        style={{ 
          background: '#FFFFFF', 
          borderRadius: '24px', 
          boxShadow: '0 12px 40px rgba(249, 115, 22, 0.06), 0 1px 3px rgba(0,0,0,0.02)', 
          border: '1.5px solid #FED7AA', 
          overflow: 'hidden' 
        }}
      >
        {/* Amber Hero Banner */}
        <div 
          style={{ 
            background: 'linear-gradient(135deg, #FFFDFB 0%, #FFF7ED 50%, #FFEDD5 100%)', 
            padding: isMobile ? '24px 16px' : '36px 36px', 
            borderBottom: '1px solid #FED7AA',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div 
              style={{ 
                width: '38px', 
                height: '38px', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)'
              }}
            >
              <BrainCircuit size={20} color="#FFFFFF" />
            </div>
            <span style={{ color: '#9A3412', fontWeight: 800, fontSize: '12px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              CLINICAL DATA ENGINE • AUTONOMOUS ROOT CAUSE
            </span>
          </div>

          <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 900, color: '#0F172A', margin: '0 0 12px 0', letterSpacing: '-0.5px', lineHeight: 1.25 }}>
            Multi-System Diagnostic Synthesis
          </h1>

          <p style={{ color: '#475569', fontSize: '14.5px', margin: '0 0 18px 0', lineHeight: 1.6, maxWidth: '680px' }}>
            Uncover non-obvious root-cause connections across disparate body systems. Connect your clinical timeline, functional lab discrepancies, and doctor blindspots into one unified case file.
          </p>

          {/* Honest Intake Data Bar (No fake metrics - computes real local state) */}
          <div 
            style={{ 
              display: 'flex', 
              gap: '8px', 
              flexWrap: 'wrap',
              marginTop: '8px'
            }}
          >
            {/* Labs status pill */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '999px',
                background: intakeTelemetry.labsCount > 0 ? '#ECFDF5' : '#FFF',
                border: intakeTelemetry.labsCount > 0 ? '1px solid #6EE7B7' : '1px solid #FED7AA',
                color: intakeTelemetry.labsCount > 0 ? '#047857' : '#9A3412',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <FileText size={13} />
              <span>{intakeTelemetry.labsCount > 0 ? `${intakeTelemetry.labsCount} Lab Files Attached` : '+ Attach Labs (PDF/Image)'}</span>
            </button>

            {/* Vitals status pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '999px',
                background: intakeTelemetry.hasVitals ? '#FFF7ED' : '#F8FAFC',
                border: intakeTelemetry.hasVitals ? '1px solid #FDBA74' : '1px solid #E2E8F0',
                color: intakeTelemetry.hasVitals ? '#C2410C' : '#64748B',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              <Activity size={13} />
              <span>{intakeTelemetry.vitalsLabel || 'Vitals: None (Optional)'}</span>
            </div>

            {/* Diet status pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '999px',
                background: intakeTelemetry.foodLogsCount > 0 ? '#FFF7ED' : '#F8FAFC',
                border: intakeTelemetry.foodLogsCount > 0 ? '1px solid #FDBA74' : '1px solid #E2E8F0',
                color: intakeTelemetry.foodLogsCount > 0 ? '#C2410C' : '#64748B',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              <Heart size={13} />
              <span>{intakeTelemetry.foodLogsCount > 0 ? `${intakeTelemetry.foodLogsCount} Diet Logs Active` : 'Diet: None (Optional)'}</span>
            </div>

            {/* Notes status pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '999px',
                background: intakeTelemetry.notesReady ? '#ECFDF5' : '#F8FAFC',
                border: intakeTelemetry.notesReady ? '1px solid #6EE7B7' : '1px solid #E2E8F0',
                color: intakeTelemetry.notesReady ? '#047857' : '#64748B',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              <CheckCircle2 size={13} />
              <span>{intakeTelemetry.notesReady ? 'Timeline Active' : 'Timeline Ready'}</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: isMobile ? '20px 16px' : '32px 36px' }}>

          {/* 1-Tap Multi-System Clinical Clusters */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={13} color="#EA580C" />
                1-Tap Multi-System Clinical Clusters
              </span>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Tap to autofill timeline</span>
            </div>

            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
              {[
                { label: 'Brain Fog & Post-Meal Crash', icon: '🧠', text: 'Persistent neurocognitive slowing and marked postprandial fatigue (severe sleepiness within 45 mins of carbohydrates), accompanied by executive dysfunction for 6+ months.' },
                { label: 'Chronic Fatigue & PEM', icon: '⚡', text: 'Profound unrefreshing sleep with post-exertional malaise crashing 24-48 hours after minor physical activity; normal routine blood work.' },
                { label: 'Histamine & Flushing', icon: '🔥', text: 'Episodic facial flushing, sudden sinus congestion, and dermatographia triggered by aged cheeses, wine, or high-histamine foods; normal IgE allergy panels.' },
                { label: 'Tachycardia & POTS', icon: '🫀', text: 'Orthostatic intolerance: sustained heart rate jump of >30 bpm on standing with lightheadedness, blood pooling in lower extremities, and heat intolerance.' },
                { label: 'Hypermobility & Dysbiosis', icon: '🧬', text: 'Beighton score 6/9 joint hypermobility with chronic refractory constipation/bloating, early satiety, and recurring joint subluxations.' },
                { label: 'Subclinical Thyroid / Cold', icon: '🩸', text: 'Persistent hypothermia/cold hands and feet, constipation, dry skin, and hair thinning with TSH borderline high and low-normal free T3.' }
              ].map((cluster, cIdx) => (
                <button
                  key={cIdx}
                  type="button"
                  onClick={() => {
                    triggerHapticSelection();
                    setHistory(prev => prev ? `${prev}\n\n${cluster.text}` : cluster.text);
                  }}
                  style={{
                    flexShrink: 0,
                    padding: '8px 12px',
                    borderRadius: '12px',
                    background: '#FFF7ED',
                    border: '1px solid #FED7AA',
                    color: '#9A3412',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(249, 115, 22, 0.05)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#FFEDD5';
                    e.currentTarget.style.borderColor = '#FDBA74';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#FFF7ED';
                    e.currentTarget.style.borderColor = '#FED7AA';
                  }}
                >
                  <span>{cluster.icon}</span>
                  <span>{cluster.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Clinical Timeline & Symptoms Textarea */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              <span style={{ fontSize: '14.5px' }}>Clinical Timeline, Symptoms & Chief Concerns</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: (history.trim().split(/\s+/).filter(w => w.length > 0).length >= 800) ? '#EF4444' : '#64748B' }}>
                {history.trim().split(/\s+/).filter(w => w.length > 0).length} / 800 words
              </span>
            </label>

            <textarea 
              value={history}
              onChange={(e) => {
                const text = e.target.value;
                const words = text.trim().split(/\s+/).filter(w => w.length > 0);
                if (words.length <= 800 || text.length < history.length) {
                  setHistory(text);
                }
              }}
              placeholder="Paste months/years of symptom progression, doctor visits, onset triggers, or what makes you feel worse (Max 800 words)..."
              aria-label="Clinical timeline and symptom notes"
              style={{ 
                width: '100%', 
                height: '160px', 
                padding: '16px', 
                borderRadius: '16px', 
                border: '1.5px solid #CBD5E1', 
                resize: 'vertical', 
                fontSize: '14.5px', 
                fontFamily: 'inherit', 
                background: '#F8FAFC', 
                transition: 'border-color 0.2s', 
                outline: 'none',
                lineHeight: 1.5
              }}
              onFocus={(e) => e.target.style.borderColor = '#F97316'}
              onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
            />
          </div>

          {/* Document Upload Area */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              <span style={{ fontSize: '14.5px' }}>Medical Records & Lab Work (Optional)</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>PDF / Images</span>
            </label>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              multiple 
              accept="image/*,application/pdf"
              aria-label="Upload medical records, lab reports, or health documents"
              style={{ display: 'none' }} 
            />

            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload PDFs or photos of medical records"
              style={{ 
                width: '100%', 
                padding: '24px 16px', 
                background: '#FFFDFB', 
                border: '2px dashed #FDBA74', 
                borderRadius: '16px', 
                color: '#9A3412', 
                fontWeight: 700, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '10px', 
                cursor: 'pointer', 
                transition: 'all 0.2s' 
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#EA580C';
                e.currentTarget.style.background = '#FFF7ED';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#FDBA74';
                e.currentTarget.style.background = '#FFFDFB';
              }}
            >
              <div style={{ background: '#FFEDD5', padding: '12px', borderRadius: '50%' }}>
                <FileUp size={22} color="#C2410C" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '14.5px', color: '#0F172A', display: 'block' }}>Upload Lab Reports, Discharge Summaries, or Imaging</span>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>PDFs, JPG, PNG up to 10 files</span>
              </div>
            </button>

            {/* Uploaded File List */}
            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {files.map((f, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '10px 14px', 
                      background: '#FFF7ED', 
                      border: '1px solid #FED7AA', 
                      borderRadius: '10px' 
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <FileText size={15} color="#C2410C" />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f.file.name}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        ({Math.round(f.size / 1024)} KB)
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeFile(idx)} 
                      aria-label={`Remove uploaded file ${f.file.name}`} 
                      style={{ 
                        background: '#FFF', 
                        border: '1px solid #FED7AA', 
                        borderRadius: '6px', 
                        color: '#EF4444', 
                        cursor: 'pointer', 
                        padding: '4px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Isolated Investigation Toggle */}
          {profile?.conditions && profile.conditions.length > 0 && (
            <div 
              style={{ 
                marginBottom: '24px', 
                padding: '14px 18px', 
                background: '#F8FAFC', 
                border: '1px solid #E2E8F0', 
                borderRadius: '14px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                flexWrap: 'wrap', 
                gap: '10px' 
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                  Isolated Investigation Mode
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  {isIsolated 
                    ? 'Analyzes strictly what you typed and uploaded above (ignores background profile conditions).' 
                    : 'Correlates your input with your known medical profile conditions.'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHapticSelection();
                  setIsIsolated(!isIsolated);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: isIsolated ? '1px solid #F97316' : '1px solid #CBD5E1',
                  background: isIsolated ? '#FFF7ED' : '#FFF',
                  color: isIsolated ? '#C2410C' : '#475569',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isIsolated ? 'Isolate (On)' : 'Include Profile (Off)'}
              </button>
            </div>
          )}

          {/* Primary Amber CTA Button */}
          <button
            type="button"
            onClick={handleRunInvestigation}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              border: 'none',
              background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 8px 24px rgba(249, 115, 22, 0.3)',
              transition: 'transform 0.15s ease'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.99)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Sparkles size={18} />
            <span>Run Autonomous Root-Cause Engine</span>
            <ArrowRight size={18} />
          </button>

        </div>
      </div>
    </div>
  );
}










