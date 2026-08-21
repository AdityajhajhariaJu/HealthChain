import { useState, useRef } from 'react';
import { GitMerge, Network, CalendarClock, ChevronRight, CheckCircle2, Download, BookOpen, Brain, FileText } from 'lucide-react';
import { CaseItem, ReviewSnapshot } from '../../services/CaseEngine';
import { useIsMobile } from '../../hooks/useIsMobile';

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
  const isMobile = useIsMobile();
  const reviews = item.reviews || [];
  const [activeReviewId, setActiveReviewId] = useState<string | null>(
    reviews.length > 0 ? reviews[reviews.length - 1].id : null
  );
  const [elifMode, setElifMode] = useState(false);
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
      const html2pdf = (await import('html2pdf.js')).default;
      html2pdf().set(opt).from(reportRef.current).save();
    } catch (e) {
      console.error('Failed to load PDF library:', e);
      alert('Could not generate PDF. Check your network connection.');
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
              const Icon = isJarvis ? Brain : isLab ? FileText : isParallel ? GitMerge : Network;
              const label = isJarvis ? 'J.A.R.V.I.S. Analysis' : isLab ? 'Lab Report' : isParallel ? 'Quick Consult' : 'Deep Collab Correlation';
              const summary = review.report?.executiveSummary || 'Review saved to case.';
              const isSelected = activeReviewId === review.id;

              return (
                <div
                  key={review.id}
                  onClick={() => setActiveReviewId(review.id)}
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
                <div style={{ display: 'flex', gap: 8 }}>
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
                        ? (activeReview.report.executiveSummary ? "Basically, the doctors looked at everything and think we have a clear idea of what's going on. Here are the main things you need to know in simple terms." : 'No summary available.') 
                        : (activeReview.report.executiveSummary || 'No summary available.')}
                  </p>
               </section>

               <section>
                  <h3 style={{ fontSize: 18, margin: '0 0 12px' }}>Discussion Pathways</h3>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {(activeReview.report.topDiagnoses || []).map((d: any, i: number) => (
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
                          <strong>{d.condition}</strong>
                          <span className="badge badge-teal">{d.specialty || 'Review'}</span>
                        </div>
                        <p
                          style={{ margin: '8px 0 0', color: '#475569', fontSize: 14, lineHeight: 1.55 }}
                        >
                          {elifMode ? `We think it might be ${d.condition}. The doctors discussed this and agree on the next steps.` : d.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
               </section>
               
               <section>
                  <h3 style={{ fontSize: 18, margin: '0 0 12px' }}>Recommended Actions</h3>
                  <div style={{ display: 'grid', gap: 8 }}>
                     {(activeReview.report.recommendedActionPlan || []).map((action: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
                           <CheckCircle2 size={18} color="#64748b"/>
                           <span style={{ fontSize: 14, color: '#334155' }}>
                              {typeof action === 'string' ? action : action.step}
                           </span>
                        </div>
                     ))}
                  </div>
               </section>
               
               <section>
                  <h3 style={{ fontSize: 18, margin: '0 0 12px' }}>Participating Specialists</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                     {activeReview.specialists.map(s => (
                        <span key={s} style={{ background: '#e2e8f0', color: '#334155', padding: '4px 10px', borderRadius: 6, fontSize: 13 }}>
                           {s}
                        </span>
                     ))}
                  </div>
               </section>
            </div>
         </div>
      ) : (
         <div className="card" style={{ padding: 36, textAlign: 'center' }}>
           <p style={{ color: '#64748b' }}>Select a snapshot to view its report.</p>
         </div>
      )}
    </div>
  );
}
