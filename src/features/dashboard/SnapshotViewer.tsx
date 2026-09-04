import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitMerge, Network, CalendarClock, ChevronRight, CheckCircle2, Download, BookOpen, Brain, BrainCircuit, FileText, Sparkles, MessageCircle } from 'lucide-react';
import { CaseItem, ReviewSnapshot } from '../../services/CaseEngine';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useToast } from '../../components/ui/ToastProvider';
import { triggerHapticLight } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import PathwaySimulator from './PathwaySimulator';

const formatDate = (value: string) => {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'N/A';
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
  } catch {
    return 'N/A';
  }
};

export default function SnapshotViewer({ item }: { item: CaseItem }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const toast = useToast();
  const reviews = item.reviews || [];
  const [activeReviewId, setActiveReviewId] = useState<string | null>(
    reviews.length > 0 ? reviews[reviews.length - 1].id : null
  );
  const [elifMode, setElifMode] = useState(false);
  const [simulatingAction, setSimulatingAction] = useState<any>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    const opt = {
      margin: 10,
      filename: `MDT_Report_${item.id}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };
    try {
      triggerHapticLight();
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set(opt).from(reportRef.current).save();
      awardPoints(10, 'Exported Clinical Report PDF 📄', 'research');
      toast.success('Report Exported', 'Clinical snapshot PDF has been generated.');
    } catch (e) {
      console.error('Failed to load PDF library, falling back to print dialog:', e);
      toast.info('Opening Print View', 'Select "Save as PDF" in your print options.');
      try {
        window.print();
      } catch (err) {
        toast.error('Export Error', 'Could not generate PDF. Please try again.');
      }
    }
  };

  const activeReview = reviews.find(r => r.id === activeReviewId);

  if (reviews.length === 0) {
    return (
      <div className="card" style={{ padding: 36, textAlign: 'center' }}>
        <h2>No reviews yet</h2>
        <p style={{ color: '#64748b' }}>Start a parallel review to generate your first snapshot.</p>
      </div>
    );
  }

  return (
    <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : 'unset', gridTemplateColumns: isMobile ? 'unset' : '320px 1fr', gap: 16, alignItems: 'start' }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
         <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Review History</h3>
         </div>
         <div>
           {[...reviews].reverse().map((review, index) => {
              const isParallel = review.type === 'parallel';
              const isJarvis = review.type === 'jarvis';
              const isLab = review.type === 'lab_report';
              const Icon = isJarvis ? BrainCircuit : isLab ? FileText : isParallel ? GitMerge : Network;
              const label = isJarvis ? 'J.A.R.V.I.S. Analysis' : isLab ? 'Lab Report' : isParallel ? 'Quick Consult' : 'Deep Collab Correlation';
              const summary = review.report?.executiveSummary || 'Review saved to case.';
              const isSelected = activeReviewId === review.id;

              return (
                <div
                  key={review.id}
                  role="button"
                  tabIndex={0}
                  aria-selected={isSelected}
                  aria-label={`Select ${label} snapshot from ${formatDate(review.createdAt)}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      triggerHapticLight();
                      setActiveReviewId(review.id);
                    }
                  }}
                  onClick={() => {
                    triggerHapticLight();
                    setActiveReviewId(review.id);
                  }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '32px 1fr',
                    gap: 12,
                    alignItems: 'start',
                    padding: '16px 20px',
                    borderBottom: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    background: isSelected ? '#F1F5F9' : '#FFF',
                    borderLeft: isSelected ? '3px solid #10B981' : '3px solid transparent',
                    transition: 'background 0.2s'
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      display: 'grid',
                      placeItems: 'center',
                      background: isParallel ? '#eef2ff' : '#ecfdf5',
                      color: isParallel ? '#4f46e5' : '#059669',
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <strong style={{ fontSize: 14, color: '#0f172a' }}>{label}</strong>
                    </div>
                    <small style={{ color: '#94a3b8', display: 'block', margin: '2px 0 6px' }}>{formatDate(review.createdAt)}</small>
                    <p style={{ margin: 0, color: '#64748b', fontSize: 13, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {summary}
                    </p>
                  </div>
                </div>
              );
           })}
         </div>
      </div>
      
      {activeReview ? (
         <div className="card" style={{ padding: isMobile ? 16 : 32 }}>
             <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #e2e8f0', gap: isMobile ? 16 : 0 }}>
                <div>
                   <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <h2 style={{ margin: 0, fontSize: isMobile ? 20 : 24 }}>
                        {activeReview.type === 'parallel' ? 'Parallel Review Report' : 'Deep Collab Consensus Report'}
                      </h2>
                      {activeReview.id === reviews[reviews.length - 1].id && (
                         <span className="badge badge-teal">Latest</span>
                      )}
                   </div>
                   <div style={{ display: 'flex', gap: 16, marginTop: 8, color: '#64748b', fontSize: 14 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                         <CalendarClock size={16}/> {formatDate(activeReview.createdAt)}
                      </span>
                   </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                   <button 
                     className="btn btn-outline"
                     style={{
                       display: 'inline-flex',
                       alignItems: 'center',
                       gap: 6,
                       color: '#4F46E5',
                       borderColor: '#C7D2FE',
                       background: '#EEF2FF',
                       fontWeight: 600
                     }}
                     onClick={() => {
                       triggerHapticLight();
                       const conditions = (activeReview.report?.topDiagnoses || [])
                         .slice(0, 2)
                         .map((d: any) => typeof d === 'string' ? d : d?.condition)
                         .filter(Boolean)
                         .join(', ');
                       const prompt = `I am reviewing a saved clinical report (${activeReview.type === 'parallel' ? 'Quick Consult' : activeReview.type === 'jarvis' ? 'J.A.R.V.I.S.' : 'MDT Consensus'}). ${activeReview.report?.executiveSummary ? `Summary: "${activeReview.report.executiveSummary}". ` : ''}${conditions ? `Key pathways: ${conditions}. ` : ''}Can you help me prepare a list of targeted questions for my upcoming clinician visit?`;
                       navigate('/app/ava', { state: { initialPrompt: prompt } });
                     }}
                   >
                     <MessageCircle size={16} /> Discuss with Ava
                   </button>
                   <button 
                     className={`btn ${elifMode ? 'btn-primary' : 'btn-outline'}`}
                     onClick={() => setElifMode(!elifMode)}
                   >
                     <BookOpen size={16} /> {elifMode ? 'Normal View' : 'ELIF Mode'}
                   </button>
                   <button className="btn btn-primary" onClick={exportToPDF}>
                     <Download size={16} /> Export PDF
                   </button>
                </div>
             </div>

             <div ref={reportRef} style={{ display: 'grid', gap: 16, padding: '10px 0' }}>
               <section>
                  <h3 style={{ fontSize: 18, margin: '0 0 12px' }}>Executive Summary</h3>
                  <p style={{ margin: 0, lineHeight: 1.6, color: '#334155' }}>
                     {elifMode 
                        ? (activeReview.report?.executiveSummary ? "Basically, the doctors looked at everything and think we have a clear idea of what's going on. Here are the main things you need to know in simple terms." : 'No summary available.') 
                        : (activeReview.report?.executiveSummary || 'No summary available.')}
                  </p>
               </section>

               <section>
                  <h3 style={{ fontSize: 18, margin: '0 0 12px' }}>Discussion Pathways</h3>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {(activeReview.report?.topDiagnoses || []).map((d: any, i: number) => {
                      const condition = typeof d === 'string' ? d : d?.condition || 'Diagnosis';
                      const rationale = typeof d === 'string' ? '' : d?.rationale || '';
                      const specialty = typeof d === 'string' ? 'Review' : d?.specialty || 'Review';
                      return (
                        <div
                          key={i}
                          style={{
                            padding: 16,
                            borderRadius: 14,
                            background: '#f8fafc',
                            borderLeft: '4px solid #10B981',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                            <strong>{condition}</strong>
                            <span className="badge badge-teal">{specialty}</span>
                          </div>
                          <p
                            style={{ margin: '8px 0 0', color: '#475569', fontSize: 14, lineHeight: 1.55 }}
                          >
                            {elifMode ? `We think it might be ${condition}. The doctors discussed this and agree on the next steps.` : rationale}
                          </p>
                        </div>
                      );
                    })}
                  </div>
               </section>
               
               <section>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <h3 style={{ fontSize: 18, margin: 0 }}>Recommended Actions</h3>
                    <span style={{ fontSize: 12, color: '#64748B' }}>Tap "Simulate & Guide" to prepare your doctor discussion</span>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                     {(activeReview.report?.recommendedActionPlan || []).map((action: any, idx: number) => {
                        const actionText = typeof action === 'string' ? action : action?.step || action?.title || action?.action || 'Action item';
                        const actionObj = typeof action === 'string' ? { step: action, id: `action_${idx}` } : action;
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: 12, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                             <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
                                <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: 14, color: '#334155', fontWeight: 500, lineHeight: 1.4 }}>
                                   {actionText}
                                </span>
                             </div>
                             <button
                               type="button"
                               className="btn btn-outline"
                               style={{
                                 padding: '6px 12px',
                                 fontSize: 12,
                                 fontWeight: 600,
                                 display: 'inline-flex',
                                 alignItems: 'center',
                                 gap: 6,
                                 borderRadius: 8,
                                 borderColor: '#cbd5e1',
                                 color: '#2563eb',
                                 background: '#eff6ff',
                                 cursor: 'pointer',
                                 flexShrink: 0,
                                 alignSelf: isMobile ? 'flex-end' : 'center'
                               }}
                               onClick={() => setSimulatingAction(actionObj)}
                             >
                               <Sparkles size={14} color="#3b82f6" /> Simulate & Guide
                             </button>
                          </div>
                        );
                     })}
                  </div>
               </section>
               
               <section>
                  <h3 style={{ fontSize: 18, margin: '0 0 12px' }}>Participating Specialists</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                     {(activeReview.specialists || []).map((s: any, sIdx: number) => {
                        const label = typeof s === 'string' ? s : s?.label || s?.name || 'Specialist';
                        return (
                          <span key={label + sIdx} style={{ background: '#e2e8f0', color: '#334155', padding: '4px 10px', borderRadius: 6, fontSize: 13 }}>
                             {label}
                          </span>
                        );
                     })}
                  </div>
               </section>
            </div>
         </div>
      ) : (
         <div className="card" style={{ padding: 36, textAlign: 'center' }}>
           <p style={{ color: '#64748b' }}>Select a snapshot to view its report.</p>
         </div>
      )}

      {simulatingAction && (
        <PathwaySimulator
          actionItem={simulatingAction}
          onClose={() => setSimulatingAction(null)}
        />
      )}
    </div>
  );
}
