import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Cpu, FileUp, Sparkles, Activity, Search, ArrowRight, ShieldCheck, 
  X, CheckCircle2, ChevronDown, ListChecks, HelpCircle 
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { runJarvisInvestigation } from '../../services/geminiService';
import { createCaseDraft, saveReviewSnapshot } from '../../services/CaseEngine';
import { getProfile } from '../../services/ProfileEngine';
import { CompilingAnimation } from '../../components/ui/CompilingAnimation';
import { Accordion } from '../../components/ui/RichReportTemplate';

export default function JarvisInvestigator() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const profile = getProfile();
  
  const [phase, setPhase] = useState<'input' | 'analyzing' | 'done'>('input');
  const [history, setHistory] = useState('');
  const [files, setFiles] = useState<{file: File, base64: string}[]>([]);
  const [report, setReport] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);
  
  useEffect(() => {
    isMounted.current = true;
    // Strictly clear all state on mount to prevent context bleeding from old cases
    setPhase('input');
    setHistory('');
    setFiles([]);
    setReport(null);
    return () => {
      isMounted.current = false;
    };
  }, []);


  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    
    // Limits: Max 5 files total
    if (files.length + selected.length > 10) {
      alert("JARVIS is currently limited to processing 10 documents at a time to prevent API overload.");
      return;
    }
    
    // Limits: Total size < 5MB per batch to control token costs
    const totalSize = selected.reduce((acc, f) => acc + f.size, 0);
    if (totalSize > 15 * 1024 * 1024) {
      alert("Total upload size must be under 15MB to optimize processing speed and cost.");
      return;
    }

    const processed = await Promise.all(selected.map(async (f) => {

      return new Promise<{file: File, base64: string}>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = (ev.target?.result as string).split(',')[1];
          resolve({ file: f, base64 });
        };
        reader.readAsDataURL(f);
      });
    }));
    
    setFiles(prev => [...prev, ...processed]);
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAnalyze = async () => {
    if (!history.trim() && files.length === 0) return;
    setPhase('analyzing');
    
    // Explicitly map base64 data to ensure no DOM elements or cyclic refs are passed
    const payloadFiles = files.map(f => ({
      mimeType: f.file.type || 'application/pdf',
      data: f.base64
    }));

    try {
      const result = await runJarvisInvestigation(history, payloadFiles, profile);
      
      if (!isMounted.current) return; // Prevent memory leak / crash if user navigated away during animation
      
      if (result) {
        setReport(result);
        
        // 1. Create the case strictly isolated from other cases
        const newCase = createCaseDraft({
          title: `J.A.R.V.I.S. Investigation`,
          intakeData: { chiefComplaint: history || "Data investigation" }
        });
        
        // 2. Persist to DB securely
        saveReviewSnapshot({
          caseId: newCase.id,
          type: 'jarvis' as any,
          report: result,
          specialists: ['J.A.R.V.I.S.']
        });
        
        // 3. Optional: we DO NOT setActiveCase here if we don't want to overwrite the user's active CaseDashboard state.
        // We let them navigate to /app/my-cases to view it, or we navigate them explicitly.
        
        setPhase('done');
      } else {
        if (!isMounted.current) return;
        alert("JARVIS encountered a network disruption or payload limit. Please try again.");
        setPhase('input');
      }
    } catch (e) {
      console.error(e);
      if (isMounted.current) {
        alert("An error occurred during analysis.");
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
      <div style={{ padding: isMobile ? '16px' : '32px', maxWidth: '900px', margin: '0 auto', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(15,23,42,0.2)' }}>
            <Cpu size={32} color="#38BDF8" />
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
                {report.topDiagnoses.map((dx: any, i: number) => (
                  <div key={i} style={{ background: '#FFF', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <strong style={{ fontSize: '16px', color: '#0F172A' }}>{dx.condition}</strong>
                      <span style={{ background: '#F0F9FF', color: '#0369A1', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>{dx.confidence}% Match</span>
                    </div>
                    <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: 1.5 }}>{dx.rationale}</p>
                  </div>
                ))}
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

        <button 
          onClick={() => navigate('/app/today')}
          style={{ width: '100%', padding: '16px', background: '#0F172A', color: '#FFF', border: 'none', borderRadius: '16px', fontWeight: 700, fontSize: '16px', marginTop: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          Return to Dashboard <ArrowRight size={20} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #0F172A, #1E293B)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 32px rgba(15,23,42,0.3)', marginBottom: '24px' }}>
          <Cpu size={40} color="#38BDF8" />
        </div>
        <h1 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 900, color: '#0F172A', letterSpacing: '-1px', margin: '0 0 12px 0' }}>
          J.A.R.V.I.S. Data Engine
        </h1>
        <p style={{ fontSize: '16px', color: '#475569', maxWidth: '500px', lineHeight: 1.6, margin: 0 }}>
          Upload years of records, labs, and history. The AI will crunch the data to find sub-clinical clues and patterns your doctors missed.
        </p>
      </div>

      <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '24px', padding: isMobile ? '20px' : '32px', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>Your Entire History</label>
          <textarea 
            value={history}
            onChange={(e) => {
              const text = e.target.value;
              const words = text.trim().split(/\s+/).filter(w => w.length > 0);
              if (words.length <= 300 || text.length < history.length) {
                setHistory(text);
              }
            }}
            placeholder="Briefly summarize your primary concern (Max 300 words)..."
            style={{ width: '100%', height: '160px', padding: '16px', borderRadius: '16px', border: '1px solid #CBD5E1', resize: 'vertical', fontSize: '15px', fontFamily: 'inherit', background: '#F8FAFC' }}
          />
          <div style={{ textAlign: 'right', fontSize: '12px', color: (history.trim().split(/\s+/).filter(w => w.length > 0).length >= 300) ? '#EF4444' : '#94A3B8', marginTop: '4px' }}>
            {history.trim().split(/\s+/).filter(w => w.length > 0).length} / 300 words
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>Medical Records & Labs</label>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            multiple 
            accept="image/*,application/pdf"
            style={{ display: 'none' }} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{ width: '100%', padding: '24px', background: '#F1F5F9', border: '2px dashed #CBD5E1', borderRadius: '16px', color: '#475569', fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <div style={{ background: '#FFF', padding: '12px', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <FileUp size={24} color="#0F172A" />
            </div>
            Upload PDFs or Photos
          </button>

          {files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              {files.map((f, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.file.name}</span>
                  <button onClick={() => removeFile(idx)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}><X size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={handleAnalyze}
          disabled={!history.trim() && files.length === 0}
          style={{ width: '100%', padding: '18px', background: (!history.trim() && files.length === 0) ? '#94A3B8' : '#0F172A', color: '#FFF', border: 'none', borderRadius: '16px', fontWeight: 800, fontSize: '16px', cursor: (!history.trim() && files.length === 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 24px rgba(15,23,42,0.25)', transition: 'all 0.2s' }}
        >
          <Sparkles size={20} /> Initialize J.A.R.V.I.S. Engine
        </button>
      </div>
    </div>
  );
}
