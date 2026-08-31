import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FileUp, Sparkles, Activity, Search, ArrowRight, ShieldCheck, 
  X, CheckCircle2, ChevronDown, ListChecks, HelpCircle, BrainCircuit 
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { runJarvisInvestigation } from '../../services/geminiService';
import { createCaseDraft, saveReviewSnapshot, getActiveCase } from '../../services/CaseEngine';
import { getActiveSession } from '../../services/authSession';
import { getProfile } from '../../services/ProfileEngine';
import { openTrialModal } from '../../services/TrialEngine';
import { useToast } from '../../components/ui/ToastProvider';
import { CompilingAnimation } from '../../components/ui/CompilingAnimation';
import { Accordion } from '../../components/ui/RichReportTemplate';
import { JarvisCore } from '../../components/ui/JarvisCoreIcon';
import { JarvisCoreOrange } from '../../components/ui/JarvisCoreIconOrange';
import { NetworkHubIcon } from '../../components/ui/NetworkHubIcon';

export default function JarvisInvestigator() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const toast = useToast();
  const profile = getProfile();
  
  const [phase, setPhase] = useState<'input' | 'analyzing' | 'done'>('input');

  useEffect(() => {
    const el = document.getElementById('main-content');
    if (el) { el.style.backgroundColor = '#EDE8E3'; }
    return () => { if (el) { el.style.backgroundColor = ''; } };
  }, []);
  const [history, setHistory] = useState('');
  const [files, setFiles] = useState<{file: File, base64: string}[]>([]);
  const [report, setReport] = useState<any>(null);
  const [isIsolated, setIsIsolated] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);
  
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  useEffect(() => {
    isMounted.current = true;
    // Strictly clear all state on mount to prevent context bleeding from old cases
    setPhase('input');
    setHistory('');
    setFiles([]);
    setReport(null);
    setCreatedCaseId(null);
    setIsIsolated(true);
    return () => {
      isMounted.current = false;
    };
  }, []);


  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    
    // Limits: Max 10 files total
    if (files.length + selected.length > 10) {
      toast.error("Document Limit", "JARVIS is currently limited to processing 10 documents at a time.");
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
            const base64 = dataUrl.split(',')[1];
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
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (!history.trim() && files.length === 0) return;

    if (!(await getActiveSession())) {
      window.dispatchEvent(new CustomEvent('hc_require_auth', {
        detail: {
          title: 'Authentication Required',
          message: 'You need to log in or sign up to run a J.A.R.V.I.S. data engine investigation.'
        }
      }));
      return;
    }

    const isVip = typeof localStorage !== 'undefined' && (localStorage.getItem('hc_vp_sig') === 'a6564a23f9738db13c830d57ebb6beede82dcb7d1bcf83239a006089de3ba40a');
    if (!profile?.isPro && !isVip) {
      openTrialModal('J.A.R.V.I.S. Root-Cause Engine');
      return;
    }

    setPhase('analyzing');
    
    // Explicitly map base64 data to ensure no DOM elements or cyclic refs are passed
    const mappedFiles = files.map(f => ({
      mimeType: f.file.type || 'application/pdf',
      data: f.base64
    }));

    try {
      // Pass profile context only if user didn't request isolation
      const contextProfile = isIsolated ? null : profile;
      const result = await runJarvisInvestigation(history, mappedFiles, contextProfile);
      
      if (!isMounted.current) return; // Prevent memory leak / crash if user navigated away during animation
      
      if (result) {
        setReport(result);
        
        // 1. Create a distinct new case draft for this specific J.A.R.V.I.S. investigation
        const newCase = createCaseDraft({
          title: `J.A.R.V.I.S.: ${(history || 'Investigation').trim().slice(0, 32)}`,
          intakeData: { chiefComplaint: history || "Data engine investigation" }
        });
        setCreatedCaseId(newCase.id);
        
        // 2. Persist to DB securely
        saveReviewSnapshot({
          caseId: newCase.id,
          type: 'jarvis' as any,
          report: result,
          specialists: ['J.A.R.V.I.S.']
        });
        
        setPhase('done');
      } else {
        if (!isMounted.current) return;
        toast.error("Analysis Disrupted", "JARVIS encountered a network disruption. Please try again.");
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
    return (
    <>
      <div style={{ padding: isMobile ? '16px' : '32px', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(15,23,42,0.2)' }}>
            <NetworkHubIcon size={32} color="#38BDF8" />
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: 0 }}>J.A.R.V.I.S. Analysis Complete</h1>
            <p style={{ color: '#475569', margin: '4px 0 0 0', fontSize: '15px' }}>The missing links and systemic patterns have been identified.</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {report.executiveSummary && (
            <div style={{ background: '#F8FAFC', padding: '24px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
              <strong style={{ color: '#0F172A', display: 'block', marginBottom: '8px', fontSize: '16px' }}>Executive Summary</strong>
              <p style={{ margin: 0, color: '#334155', lineHeight: 1.6 }}>{report.executiveSummary}</p>
            </div>
          )}

          {report.missingLinks && report.missingLinks.length > 0 && (
            <Accordion title="The Missing Links" icon={Search} iconColor="#EAB308" bgColor="#FEFCE8" borderColor="#FEF08A" textColor="#854D0E" isMobile={isMobile} defaultOpen={true}>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {report.missingLinks.map((link: string, i: number) => (
                  <li key={i} style={{ color: '#854D0E', lineHeight: 1.6 }}>{link}</li>
                ))}
              </ul>
            </Accordion>
          )}

          {report.functionalBiomarkers && report.functionalBiomarkers.length > 0 && (
            <div style={{ background: '#F0FDF4', borderRadius: '20px', padding: '24px', border: '1px solid #BBF7D0' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
                <Activity size={20} color="#15803D" /> Sub-clinical Biomarker Insights
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {report.functionalBiomarkers.map((bio: any, i: number) => (
                  <div key={i} style={{ background: '#FFF', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ color: '#0F172A', fontSize: '15px' }}>{bio.biomarker}</strong>
                      <span style={{ background: '#FEF2F2', color: '#991B1B', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>Value: {bio.value}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '13px', color: '#64748B' }}>
                      <span>Standard Range: {bio.standardRange}</span>
                      <span>Optimal Range: <strong>{bio.optimalRange}</strong></span>
                    </div>
                    <p style={{ margin: 0, color: '#334155', fontSize: '14px', lineHeight: 1.5, padding: '12px', background: '#F8FAFC', borderRadius: '8px' }}>
                      {bio.insight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.systemicPatterns && report.systemicPatterns.length > 0 && (
            <Accordion title="Systemic Patterns Detected" icon={Sparkles} iconColor="#8B5CF6" bgColor="#F5F3FF" borderColor="#DDD6FE" textColor="#5B21B6" isMobile={isMobile} defaultOpen={true}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {report.systemicPatterns.map((pat: any, i: number) => (
                  <div key={i}>
                    <strong style={{ color: '#4C1D95', display: 'block', marginBottom: '4px' }}>{pat.pattern}</strong>
                    <p style={{ margin: 0, color: '#5B21B6', lineHeight: 1.5 }}>{pat.evidence}</p>
                  </div>
                ))}
              </div>
            </Accordion>
          )}

          {report.topDiagnoses && report.topDiagnoses.length > 0 && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>Possible Underlying Conditions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                {report.topDiagnoses.map((dx: any, i: number) => {
                  const numPct = typeof dx.confidence === 'number' ? dx.confidence : parseInt(dx.confidence) || 0;
                  const tierLabel = numPct >= 50 ? 'Tier 1 • High Clinical Corroboration' : numPct >= 25 ? 'Tier 2 • Moderate Consideration' : 'Tier 3 • Low / Ruling-Out Only';
                  const badgeBg = numPct >= 50 ? '#ECFDF5' : numPct >= 25 ? '#EFF6FF' : '#F8FAFC';
                  const badgeColor = numPct >= 50 ? '#059669' : numPct >= 25 ? '#2563EB' : '#64748B';
                  const badgeBorder = numPct >= 50 ? '#A7F3D0' : numPct >= 25 ? '#BFDBFE' : '#E2E8F0';

                  return (
                    <div key={i} style={{ background: '#FFF', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: 6 }}>
                        <strong style={{ fontSize: '16px', color: '#0F172A' }}>{dx.condition}</strong>
                        {numPct > 0 && (
                          <span style={{ background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}`, padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                            {numPct}% Match
                          </span>
                        )}
                      </div>
                      <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, color: badgeColor, marginBottom: '8px' }}>
                        {tierLabel}
                      </span>
                      <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: 1.5 }}>{dx.rationale}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {report.questionsForClinician && report.questionsForClinician.length > 0 && (
            <Accordion title="Questions for Your Clinician" icon={HelpCircle} iconColor="#0F172A" bgColor="#F1F5F9" borderColor="#E2E8F0" textColor="#0F172A" isMobile={isMobile} defaultOpen={true}>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {report.questionsForClinician.map((q: string, i: number) => (
                  <li key={i} style={{ color: '#334155', lineHeight: 1.6 }}>{q}</li>
                ))}
              </ul>
            </Accordion>
          )}
        </div>

        {/* J.A.R.V.I.S. Next-Step Bridge */}
        <div style={{ marginTop: '36px', background: '#FFF', padding: isMobile ? '20px' : '28px', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 8px 30px rgba(15,23,42,0.04)' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>Next Steps with Your Findings</h3>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '0 0 20px 0' }}>Take these insights further with our AI care team or prepare for your physician visit.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px' }}>
            <button 
              onClick={() => navigate('/app/ava')}
              style={{ padding: '14px 18px', background: 'linear-gradient(135deg, #0EA5E9, #0284C7)', color: '#FFF', border: 'none', borderRadius: '14px', fontWeight: 700, fontSize: '14.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(14,165,233,0.25)' }}
            >
              💬 Discuss with Ava
            </button>
            <button 
              onClick={() => navigate('/app/mdt')}
              style={{ padding: '14px 18px', background: '#F8FAFC', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: '14px', fontWeight: 700, fontSize: '14.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              🧠 Elevate to Board
            </button>
            <button 
              onClick={() => createdCaseId ? navigate(`/app/cases/${createdCaseId}`) : navigate('/app/cases')}
              style={{ padding: '14px 18px', background: '#0F172A', color: '#FFF', border: 'none', borderRadius: '14px', fontWeight: 700, fontSize: '14.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              📋 Open Case File <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      <div style={{ padding: isMobile ? '16px' : '32px', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px', position: 'relative' }}>
      
      <div
        style={{
﻿          background: 'linear-gradient(180deg, #F5F1ED 0%, #D8CFC4 100%)', 
          borderRadius: isMobile ? '0 0 80px 80px' : '160px 160px 24px 24px', 
          padding: isMobile ? '40px 24px' : '56px 40px', 
          margin: isMobile ? '-16px -16px 24px -16px' : '0 0 24px 0',
          position: 'relative', 
          overflow: 'hidden', 
          boxShadow: 'inset 0 10px 20px rgba(255,255,255,0.7), 0 20px 40px rgba(0,0,0,0.05)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          border: '1px solid #FFF'
        }}
      >
        <div style={{ position: 'absolute', inset: 0, opacity: 0.4, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")', mixBlendMode: 'overlay' }} />
        
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 0, opacity: 0.2, pointerEvents: 'none' }}>
          <JarvisCoreOrange size={isMobile ? 240 : 320} color="#AA8C2C" />
        </div>
        
        <div style={{ position: 'relative', zIndex: 1, maxWidth: isMobile ? '100%' : '80%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px', marginTop: '-56px' }}>
             <div style={{ width: '2px', height: '80px', background: 'linear-gradient(to bottom, #D4AF37, #AA8C2C)' }} />
             <div style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)', border: '1px solid #AA8C2C', padding: '6px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(170,140,44,0.1)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#AA8C2C', animation: 'pulse 3s infinite' }} />
                <span style={{ color: '#4A423A', fontWeight: 800, fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'serif' }}>J.A.R.V.I.S. Engine</span>
             </div>
          </div>
          
          <h2 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 500, color: '#4A423A', margin: '0 0 20px 0', letterSpacing: '-0.5px', fontFamily: 'serif' }}>
            Uncover the missing link.
          </h2>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.5)', color: '#4A423A', borderRadius: '24px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)', textTransform: 'uppercase', letterSpacing: '0.5px' }}><Search size={14} /> Unvarnished Insights</span>
            <span style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #6B9B9E 0%, #4A7A7D 100%)', color: '#FFF', borderRadius: '24px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 12px rgba(74, 122, 125, 0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}><CheckCircle2 size={14} /> One-Shot</span>
          </div>
          
          <p style={{ color: '#7A6E62', fontSize: '14px', margin: '0', fontWeight: 500, lineHeight: 1.6, maxWidth: '440px' }}>
            We crunch all your data and extract precise, actionable insights. No chat, no back-and-forth—just upload your history and discover patterns your doctors missed.
          </p>
        </div>
      </div>

      <div style={{ 
        background: 'linear-gradient(135deg, #6B9B9E 0%, #4A7A7D 100%)', 
        borderRadius: '80px 80px 24px 24px', 
        padding: isMobile ? '32px 24px' : '48px', 
        boxShadow: 'inset 0 4px 12px rgba(255,255,255,0.2), 0 20px 40px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#FFF'
      }}>
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 500, color: '#FFF', marginBottom: '16px', fontFamily: 'serif', fontSize: '20px' }}>
            <span>Clinical Timeline & Symptoms</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#4A7A7D', padding: '6px 12px', background: 'rgba(255,255,255,0.9)', borderRadius: '12px', border: 'none', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Raw Text</span>
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
            placeholder="Paste years of notes, symptom timelines, or primary concerns here (Max 800 words)..."
            style={{ width: '100%', height: '180px', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.2)', resize: 'vertical', fontSize: '15px', fontFamily: 'inherit', background: 'rgba(255,255,255,0.1)', color: '#FFF', transition: 'all 0.2s', outline: 'none' }}
            onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.15)'; e.target.style.borderColor = 'rgba(255,255,255,0.5)'; }}
            onBlur={(e) => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.borderColor = 'rgba(255,255,255,0.2)'; }}
          />
          <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: 600, color: (history.trim().split(/\s+/).filter(w => w.length > 0).length >= 800) ? '#FFAA99' : 'rgba(255,255,255,0.6)', marginTop: '12px' }}>
            {history.trim().split(/\s+/).filter(w => w.length > 0).length} / 800 words
          </div>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 500, color: '#FFF', marginBottom: '16px', fontFamily: 'serif', fontSize: '20px' }}>
            <span>Medical Records & Labs</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#4A7A7D', padding: '6px 12px', background: 'rgba(255,255,255,0.9)', borderRadius: '12px', border: 'none', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PDF / Images</span>
          </label>
          <input 
            type="file" 
            onChange={handleFileSelect} 
            multiple 
            accept="image/*,application/pdf"
            style={{ display: 'none' }} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{ width: '100%', padding: '32px', background: '#F8FAFC', border: '2px dashed #CBD5E1', borderRadius: '16px', color: '#475569', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#38BDF8'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#CBD5E1'}
          >
            <div style={{ background: '#FFF', padding: '16px', borderRadius: '50%', boxShadow: '0 8px 16px rgba(0,0,0,0.06)' }}>
              <FileUp size={28} color="#0F172A" />
            </div>
            <span style={{ fontSize: '16px' }}>Upload PDFs or Photos</span>
          </button>

          {files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
              {files.map((f, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.file.name}</span>
                  <button onClick={() => removeFile(idx)} style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#EF4444', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}><X size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {profile?.conditions && profile.conditions.length > 0 && (
          <div style={{ marginBottom: '28px', padding: '16px 20px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                Isolated Investigation (New Case)
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                {isIsolated
                  ? 'Isolated Investigation (Analyzes only the symptoms & records you entered above).'
                  : `Cross-Correlating with active background conditions (${profile.conditions.slice(0, 2).map((c: string) => c.split(',')[0]).join(', ')}).`}
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: isIsolated ? '#EA580C' : '#64748B' }}>
              <input
                type="checkbox"
                checked={isIsolated}
                onChange={(e) => setIsIsolated(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#EA580C', cursor: 'pointer' }}
              />
              {isIsolated ? 'Isolated (New Case)' : 'Include Profile'}
            </label>
          </div>
        )}

        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAnalyze} disabled={!history.trim() && files.length === 0} style={{ width: '100%', padding: '20px', background: (!history.trim() && files.length === 0) ? '#E2E8F0' : 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', color: (!history.trim() && files.length === 0) ? '#94A3B8' : '#FFF', borderRadius: '16px', border: 'none', fontSize: '18px', fontWeight: 800, cursor: (!history.trim() && files.length === 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: (!history.trim() && files.length === 0) ? 'none' : '0 10px 25px rgba(234,88,12,0.3)', transition: 'all 0.2s' }}> <Sparkles size={24} /> Initiate Core Investigation </motion.button>
      </div>
    </div>
    </>
  );
}













