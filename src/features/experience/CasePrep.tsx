import React, { useState, useEffect, useMemo } from 'react';
import { getCases, CaseItem, getCase, saveAppointmentBrief, AppointmentBrief } from '../../services/CaseEngine';
import { generateDeterministicBrief, isBriefUpToDate } from '../../services/AppointmentBriefService';
import { refineAppointmentBrief } from '../../services/geminiService';
import { getProfile } from '../../services/ProfileEngine';
import { ArrowRight, Briefcase, ChevronRight, FileText, Loader2, Printer, Sparkles, AlertCircle, Eye, Info, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../components/ui/ToastProvider';

export default function CasePrep() {
  const navigate = useNavigate();
  const toast = useToast();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [brief, setBrief] = useState<AppointmentBrief | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  useEffect(() => {
    const allCases = getCases().filter(c => c.status === 'active');
    setCases(allCases);
    if (allCases.length === 1) {
      setSelectedCase(allCases[0]);
    }
  }, []);

  useEffect(() => {
    if (selectedCase) {
      const profile = getProfile();
      // Check if we have a valid cached brief
      let currentBrief = selectedCase.appointmentBriefs?.current;
      if (!currentBrief || !isBriefUpToDate(currentBrief, selectedCase, profile)) {
        currentBrief = generateDeterministicBrief(selectedCase, profile);
        saveAppointmentBrief(selectedCase.id, currentBrief);
      }
      setBrief(currentBrief);
    }
  }, [selectedCase]);

  const handleRefine = async () => {
    if (!brief || !selectedCase) return;
    setIsRefining(true);
    try {
      const refined = await refineAppointmentBrief(brief);
      if (refined) {
        saveAppointmentBrief(selectedCase.id, refined);
        setBrief(refined);
        toast.success('Brief Refined', 'AI polished your clinical appointment brief.');
      }
    } catch (e) {
      console.error('Failed to refine appointment brief:', e);
      toast.error('Refinement Failed', 'Could not refine appointment brief. Please try again.');
    } finally {
      setIsRefining(false);
    }
  };

  if (!selectedCase && !showPicker) {
    return (
      <main style={{ maxWidth: 800, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, background: '#f0fdfa', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#0d9488' }}>
          <Briefcase size={36} />
        </div>
        <h1 style={{ fontSize: 32, color: '#0f172a', marginBottom: 16 }}>Prepare my appointment</h1>
        <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.6, maxWidth: 500, margin: '0 auto 32px' }}>
          Choose the case you want to bring to your clinician. We will organise its existing symptoms, records, past AI summaries, and unanswered questions into one clear brief.
        </p>
        <button className="btn btn-primary" onClick={() => setShowPicker(true)} style={{ padding: '14px 28px', fontSize: 16, borderRadius: 30 }}>
          Import my case <ArrowRight size={18} style={{ marginLeft: 8 }} />
        </button>
      </main>
    );
  }

  if (showPicker) {
    return (
      <main style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
        <h2 style={{ fontSize: 24, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Briefcase size={24} color="#0d9488" /> Choose a case
        </h2>
        {cases.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: '#f8fafc', borderRadius: 16 }}>
            <p>You don't have any active cases yet.</p>
            <button className="btn btn-primary" onClick={() => navigate('/app/consult')} style={{ marginTop: 16 }}>Start a Quick Consult</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {cases.map(c => (
              <div 
                key={c.id} 
                onClick={() => { setSelectedCase(c); setShowPicker(false); }}
                style={{ padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border 0.2s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#0d9488'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
              >
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#0f172a' }}>{c.title || 'Untitled Case'}</h3>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    Updated {new Date(c.updatedAt).toLocaleDateString()} &middot; {c.medicalRecords?.length || 0} records
                  </div>
                </div>
                <ChevronRight size={20} color="#94a3b8" />
              </div>
            ))}
          </div>
        )}
      </main>
    );
  }

  if (!brief) {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={32} className="spin" color="#0d9488" />
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px 80px' }}>
      
      {/* Print Hide Controls */}
      <div className="print-hide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <button className="btn btn-outline btn-sm" onClick={() => { setSelectedCase(null); setShowPicker(false); }}>
          &larr; Change case
        </button>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
            <Printer size={16} style={{ marginRight: 6 }} /> Print Brief
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowDrawer(true)}>
            <Eye size={16} style={{ marginRight: 6 }} /> See supporting detail
          </button>
        </div>
      </div>

      <div className="print-hide" style={{ display: 'flex', justifyContent: 'space-between', background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '12px 16px', borderRadius: 12, marginBottom: 32, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0f766e' }}>
          <CheckCircle2 size={16} /> Prepared from your saved case &middot; Up to date
        </div>
        <button 
          onClick={handleRefine}
          disabled={isRefining || brief.isRefinedByAI}
          style={{ background: 'none', border: 'none', color: '#0d9488', fontSize: 13, fontWeight: 600, cursor: (isRefining || brief.isRefinedByAI) ? 'default' : 'pointer', opacity: brief.isRefinedByAI ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {isRefining ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />} 
          {brief.isRefinedByAI ? 'Refined for discussion' : 'Make this easier to discuss'}
        </button>
      </div>

      {/* The Printable Brief */}
      <div className="case-prep-printable-dossier" style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 40 }}>
        
        <header style={{ borderBottom: '2px solid #0f172a', paddingBottom: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>HealthChain Appointment Brief</div>
          <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>Prepared for clinician discussion</h1>
          <div style={{ marginTop: 12, fontSize: 14, color: '#475569', display: 'flex', gap: 16 }}>
            <span><strong>Case:</strong> {selectedCase!.title}</span>
            <span><strong>Updated:</strong> {new Date(brief.generatedAt).toLocaleDateString()}</span>
          </div>
        </header>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, color: '#0f766e', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 16 }}>1. What I need help with</h2>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: '#0f172a', margin: 0 }}>{brief.mainConcern.text}</p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, color: '#0f766e', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 16 }}>2. What changed and when</h2>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: '#334155' }}>
            {brief.timeline.map((t, i) => (
              <li key={i}><strong>{t.date}:</strong> {t.event}</li>
            ))}
            {brief.timeline.length === 0 && <li>No timeline events recorded.</li>}
          </ul>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, color: '#0f766e', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 16 }}>3. Important context to review</h2>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: '#334155' }}>
            {brief.knownFacts.map((f, i) => <li key={i}>{f.text}</li>)}
            {brief.missingInformation.map((m, i) => <li key={i} style={{ color: '#b45309' }}>Missing: {m.missingText}</li>)}
            {brief.knownFacts.length === 0 && brief.missingInformation.length === 0 && <li>No relevant medical context recorded.</li>}
          </ul>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, color: '#0f766e', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 16 }}>4. Questions worth asking</h2>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: '#334155' }}>
            {brief.questionsForClinician.map((q, i) => <li key={i}>{q.question}</li>)}
          </ul>
        </section>
        
        <section style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: 16, borderRadius: 12, display: 'flex', gap: 12, fontSize: 13, color: '#9a3412', lineHeight: 1.5 }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>{brief.safetyNotice}</div>
        </section>
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100000 }}
              onClick={() => setShowDrawer(false)}
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 450, background: '#fff', zIndex: 100001, boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}><Info size={20} color="#0d9488" /> Supporting detail</h3>
                <button onClick={() => setShowDrawer(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748b' }}>&times;</button>
              </div>
              <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
                <p style={{ fontSize: 14, color: '#475569', marginBottom: 24, lineHeight: 1.5 }}>
                  This brief was deterministically generated without inventing new facts. Here are the perspectives mapped into your brief:
                </p>
                <div style={{ display: 'grid', gap: 16 }}>
                  {brief.priorPerspectives.map((p, i) => (
                    <div key={i} style={{ padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>{p.title}</div>
                      <div style={{ fontSize: 14, color: '#0f172a', lineHeight: 1.5 }}>{p.summary}</div>
                    </div>
                  ))}
                  {brief.priorPerspectives.length === 0 && <div style={{ fontSize: 14, color: '#64748b' }}>No prior perspectives found for this case.</div>}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </main>
  );
}
