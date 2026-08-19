import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  GitMerge,
  Network,
  Plus,
  Sparkles,
  Stethoscope,
  Clock,
  Archive,
  Printer
} from 'lucide-react';
import { getCase, getCases, setActiveCase, toggleCaseAction, resolveCase, CaseItem, ReviewSnapshot } from '../../services/CaseEngine';
import { getProfile } from '../../services/ProfileEngine';
import SnapshotViewer from './SnapshotViewer';
import DDxBoard from './DDxBoard';
import PathwaySimulator from './PathwaySimulator';
import { useIsMobile } from '../../hooks/useIsMobile';
import { ActiveCaseBar } from '../../components/layout/AppShell';
import { RichReportTemplate } from '../../components/ui/RichReportTemplate';

const formatDate = (value: string) => {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'N/A';
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
  } catch {
    return 'N/A';
  }
};

export default function CaseDashboard() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { id } = useParams();
  const [cases, setCases] = useState(getCases());
  const [profile, setProfile] = useState(getProfile());
  const [simulatorAction, setSimulatorAction] = useState<any>(null);

  useEffect(() => {
    const refresh = () => {
      setCases(getCases());
      setProfile(getProfile());
    };
    window.addEventListener('hc_cases_updated', refresh);
    window.addEventListener('hc_profile_updated', refresh);
    return () => {
      window.removeEventListener('hc_cases_updated', refresh);
      window.removeEventListener('hc_profile_updated', refresh);
    };
  }, []);

  useEffect(() => {
    if (id && getCase(id)) setActiveCase(id);
  }, [id]);

  const nextActions = useMemo(
    () =>
      cases
        .flatMap((c) =>
          c.actions
            .filter((a) => a.status !== 'completed')
            .slice(0, 2)
            .map((a) => ({ ...a, caseId: c.id, caseTitle: c.title }))
        )
        .slice(0, 4),
    [cases]
  );

  const completed = useMemo(() => cases.reduce(
    (sum, c) => sum + c.actions.filter((a) => a.status === 'completed').length,
    0
  ), [cases]);

  if (id) {
    const activeCase = getCase(id);
    if (!activeCase) {
       return (
         <div className="card" style={{ padding: 36, textAlign: 'center', margin: '40px auto', maxWidth: 600 }}>
           <h2>Case not found</h2>
           <button className="btn btn-primary" onClick={() => navigate('/app/today')}>
             Back to Health Today
           </button>
         </div>
       );
    }
    return <CaseWorkspace item={activeCase} navigate={navigate} refresh={() => setCases(getCases())} />;
  }

  // General dashboard (Health Today)
  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', paddingBottom: 40 }}>
      <section
        style={{
          borderRadius: 28,
          padding: isMobile ? '26px 24px' : '38px',
          color: '#fff',
          background: 'linear-gradient(135deg,#0f172a,#153d45 65%,#059669)',
          boxShadow: '0 18px 45px rgba(15,23,42,.18)',
          marginBottom: 28,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#99f6e4',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: isMobile ? 12 : 16,
          }}
        >
          <Sparkles size={15} /> Your health command centre
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: isMobile ? 18 : 24,
            flexWrap: 'wrap',
            alignItems: 'end',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 28 : 38, letterSpacing: -1.2, lineHeight: 1.1 }}>
              Good to see you
              {profile.demographics.name ? `, ${(profile?.demographics?.name || '').split(' ')[0] || 'User'}` : ''}.
            </h1>
            <p style={{ color: '#cbd5e1', lineHeight: 1.5, maxWidth: 620, margin: '12px 0 0', fontSize: isMobile ? 14 : 16 }}>
              Start with parallel AI specialist perspectives, then bring their findings into a Deep
              Collaborative Specialist review for consensus when your case needs deeper correlation.
            </p>
          </div>
          <button
            className="btn"
            onClick={() => navigate('/app/consult')}
            style={{ background: '#fff', color: '#0f172a', padding: isMobile ? '12px 16px' : '14px 20px', fontWeight: 800, width: isMobile ? '100%' : 'auto', display: 'flex', justifyContent: 'center' }}
          >
            <Stethoscope size={18} /> Start Quick Consult
          </button>
        </div>
      </section>

      <div style={{ marginBottom: 28 }}>
        <ActiveCaseBar navigate={navigate} />
      </div>

      <div
        style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'column' : 'unset',
          gridTemplateColumns: isMobile ? 'unset' : '1.35fr .65fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <section className="card" style={{ padding: isMobile ? 18 : 26 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 21 }}>Your next actions</h2>
                <p style={{ margin: '5px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
                  Actions from your active collaborative cases.
                </p>
              </div>
              <span className="badge badge-teal">{nextActions.length} to focus on</span>
            </div>
            {nextActions.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10 }}>
                {nextActions.map((action) => (
                  <div
                    key={action.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      padding: 16,
                      borderRadius: 14,
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      justifyContent: 'space-between',
                      alignItems: isMobile ? 'stretch' : 'center',
                      gap: isMobile ? 16 : 12,
                      minWidth: 0
                    }}
                  >
                    <div 
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', flex: 1, minWidth: 0 }}
                      onClick={() => toggleCaseAction(action.caseId, action.id)}
                    >
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 99,
                          border: '2px solid #10B981',
                          flexShrink: 0,
                          marginTop: 2
                        }}
                      />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ display: 'block', color: '#0f172a', fontSize: 14, wordBreak: 'break-word' }}>
                          {action.step}
                        </strong>
                        <small style={{ color: '#64748b', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {action.caseTitle} · {action.timeline || 'Add a timeline'}
                        </small>
                      </span>
                    </div>
                    <button 
                      onClick={() => setSimulatorAction(action)}
                      style={{ 
                        background: '#eff6ff', 
                        color: '#3b82f6', 
                        border: 'none', 
                        padding: '10px 16px', 
                        borderRadius: 8, 
                        fontSize: 13, 
                        fontWeight: 600, 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: 6, 
                        flexShrink: 0,
                        width: isMobile ? '100%' : 'auto'
                      }}
                    >
                      <GitMerge size={14} />
                      Simulate Path
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyAction navigate={navigate} />
            )}
          </section>
          <section>
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: isMobile ? 12 : 0,
                marginBottom: 14,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 21 }}>Active cases</h2>
                <p style={{ margin: '5px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
                  Reopen a case as reports, appointments, or symptoms evolve.
                </p>
              </div>
              <button className="btn btn-outline btn-sm" style={{ width: isMobile ? '100%' : 'auto' }} onClick={() => navigate('/app/consult')}>
                <Plus size={15} /> Quick Consult
              </button>
            </div>
            {cases.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
                {cases.map((item) => (
                  <CaseCard key={item.id} item={item} navigate={navigate} />
                ))}
              </div>
            ) : (
              <EmptyCase navigate={navigate} />
            )}
          </section>
        </div>
        <aside style={{ display: 'grid', gap: 16 }}>
          <section className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', gap: 10, color: '#10B981', alignItems: 'center' }}>
              <Activity size={19} />
              <strong>Care momentum</strong>
            </div>
            <div style={{ fontSize: isMobile ? 30 : 38, fontWeight: 850, marginTop: 16 }}>{completed}</div>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 13 }}>
              case actions completed
            </p>
          </section>
          <section className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', gap: 10, color: '#10B981', alignItems: 'center' }}>
              <FileText size={19} />
              <strong>Your health record</strong>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)',
                gap: 8,
                margin: '16px 0',
              }}
            >
              <div
                style={{
                  padding: '10px 6px',
                  background: '#F0FDFA',
                  borderRadius: 10,
                  textAlign: 'center',
                }}
              >
                <strong style={{ display: 'block', fontSize: 18 }}>
                  {profile.conditions.length}
                </strong>
                <small style={{ color: '#64748B', fontSize: 10 }}>CONDITIONS</small>
              </div>
              <div
                style={{
                  padding: '10px 6px',
                  background: '#F0FDFA',
                  borderRadius: 10,
                  textAlign: 'center',
                }}
              >
                <strong style={{ display: 'block', fontSize: 18 }}>
                  {profile.medications.length}
                </strong>
                <small style={{ color: '#64748B', fontSize: 10 }}>MEDICINES</small>
              </div>
              <div
                style={{
                  padding: '10px 6px',
                  background: '#F0FDFA',
                  borderRadius: 10,
                  textAlign: 'center',
                }}
              >
                <strong style={{ display: 'block', fontSize: 18 }}>
                  {profile.allergies.length}
                </strong>
                <small style={{ color: '#64748B', fontSize: 10 }}>ALLERGIES</small>
              </div>
            </div>
            <button
              className="btn btn-outline btn-sm"
              style={{ width: '100%' }}
              onClick={() => navigate('/app/profile')}
            >
              Open Medical Profile <ArrowRight size={14} />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function CaseWorkspace({ item, navigate, refresh }: { item: CaseItem, navigate: any, refresh: any }) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'evidence' | 'reviews' | 'actions' | 'ddx'>('overview');
  const [simulatorAction, setSimulatorAction] = useState<any>(null);
  const report = item.currentSummary || {};
  const records = item.medicalRecords || [];
  const profile = getProfile();

  return (
    <div style={{ maxWidth: 1020, margin: '0 auto', paddingBottom: 40 }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/my-cases')}>
        <ArrowLeft size={16} /> Back to My Cases
      </button>


      
      <PrintableDossier item={item} profile={profile} />

      <div style={{ display: 'flex', gap: 20, marginTop: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 10, overflowX: 'auto' }}>
        {['overview', 'ddx', 'timeline', 'evidence', 'reviews', 'actions'].map(tab => (
          <button 
             key={tab} 
             onClick={() => setActiveTab(tab as any)}
             style={{ 
               background: 'transparent', 
               border: 'none', 
               cursor: 'pointer', 
               fontSize: 16, 
               fontWeight: activeTab === tab ? 700 : 500,
               color: activeTab === tab ? '#10B981' : '#64748b',
               borderBottom: activeTab === tab ? '2px solid #10B981' : 'none',
               paddingBottom: 6,
               textTransform: 'capitalize',
               whiteSpace: 'nowrap',
               flexShrink: 0
             }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        {activeTab === 'overview' && (
          <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : 'unset', gridTemplateColumns: isMobile ? 'unset' : '1.25fr .75fr', gap: 22, alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 22 }}>
              <section className="card" style={{ padding: 24, background: 'transparent', border: 'none', boxShadow: 'none' }}>
                <h2 style={{ fontSize: 20, margin: '0 0 16px' }}>Current Case Synthesis</h2>
                <RichReportTemplate report={report} isMobile={isMobile} />
              </section>
              <section className="card" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 20, margin: '0 0 16px' }}>Possible pathways to discuss</h2>
                <div style={{ display: 'grid', gap: 12 }}>
                  {(Array.isArray(report.topDiagnoses) ? report.topDiagnoses : []).map((d: any, i: number) => (
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
                        {d.rationale}
                      </p>
                      {d.citations && d.citations.length > 0 && (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                          <strong style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Clinical Evidence</strong>
                          <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 13, color: '#475569' }}>
                            {d.citations.map((cit: any, citIdx: number) => (
                              <li key={citIdx} style={{ marginBottom: 4 }}>
                                <a href={cit.link} target="_blank" rel="noreferrer" style={{ color: '#10B981', textDecoration: 'none' }}>
                                  {cit.title}
                                </a> — <i>{cit.journal} ({cit.year})</i>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )) || <p>No pathways yet.</p>}
                </div>
              </section>
            </div>
            <aside style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
              <section className="card" style={{ padding: 20 }}>
                <h2 style={{ fontSize: 18, margin: '0 0 14px' }}>Case Status</h2>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                   <Archive size={16} color="#64748b"/> 
                   <span style={{ fontSize: 14, textTransform: 'capitalize' }}>{item.status}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                   <Clock size={16} color="#64748b"/> 
                   <span style={{ fontSize: 14 }}>Last updated: {formatDate(item.updatedAt)}</span>
                </div>
              </section>
            </aside>
          </div>
        )}

        {activeTab === 'ddx' && (
          <DDxBoard item={item} profile={profile} />
        )}

        {activeTab === 'timeline' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
            style={{ padding: 32 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 22, margin: '0 0 6px', color: 'var(--text-main)' }}>Clinical Timeline</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
                  The progression of evidence, actions, and specialist consensus.
                </p>
              </div>
            </div>
            
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              {/* Vertical connecting line */}
              <div style={{ position: 'absolute', top: 12, bottom: 12, left: 2, width: 2, background: 'linear-gradient(to bottom, #10B981 0%, #3B82F6 100%)', opacity: 0.2, borderRadius: 2 }} />
              
              <div style={{ display: 'grid', gap: 16 }}>
                <AnimatePresence>
                  {([...(item.events || []), ...(item.reviews || [])].sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())).map((timelineItem: any, index: number) => {
                     const isReview = !!timelineItem.type && !timelineItem.label;
                     const isMDT = timelineItem.type === 'mdt';
                     const date = timelineItem.date || timelineItem.createdAt;
                     const Icon = isReview ? (isMDT ? Network : GitMerge) : CheckCircle2;
                     
                     return (
                       <motion.div 
                          key={timelineItem.id} 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          style={{ position: 'relative' }}
                       >
                          <div style={{
                             position: 'absolute',
                             left: -33,
                             top: 4,
                             background: isReview ? (isMDT ? '#ECFDF5' : '#EEF2FF') : '#F8FAFC',
                             color: isReview ? (isMDT ? '#059669' : '#4F46E5') : '#64748B',
                             borderRadius: '50%',
                             width: 24,
                             height: 24,
                             display: 'flex',
                             alignItems: 'center',
                             justifyContent: 'center',
                             boxShadow: '0 0 0 4px #FFF, 0 4px 12px rgba(0,0,0,0.08)'
                          }}>
                             <Icon size={14} strokeWidth={2.5} />
                          </div>
                          
                          <div
                             style={{ 
                               background: isReview ? (isMDT ? 'linear-gradient(to right, rgba(16,185,129,0.05), transparent)' : 'linear-gradient(to right, rgba(79,70,229,0.05), transparent)') : 'transparent',
                               padding: '16px 20px', 
                               borderRadius: 16,
                               border: `1px solid ${isReview ? (isMDT ? 'rgba(16,185,129,0.2)' : 'rgba(79,70,229,0.2)') : '#F1F5F9'}`,
                               transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                               cursor: 'default'
                             }}
                             onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.04)'; }}
                             onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                          >
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <div>
                                   <strong style={{ fontSize: 15, color: isReview ? (isMDT ? '#065F46' : '#3730A3') : '#334155', display: 'block', marginBottom: 2 }}>
                                      {isReview ? `${isMDT ? 'Deep Collab' : 'Quick Consult'} Snapshot` : timelineItem.label}
                                   </strong>
                                   <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                                      <Clock size={12} /> {formatDate(date)}
                                   </div>
                                </div>
                                {isReview && (
                                   <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 99, background: isMDT ? '#D1FAE5' : '#E0E7FF', color: isMDT ? '#065F46' : '#3730A3', fontWeight: 600 }}>
                                      {timelineItem.specialists?.length || 0} Specialists
                                   </span>
                                )}
                             </div>
                             
                             <p style={{ margin: 0, fontSize: 14, color: 'var(--text-main)', lineHeight: 1.6 }}>
                                {isReview ? (
                                   <>
                                      This snapshot synthesized findings from <b>{timelineItem.basedOn.evidenceIds.length} evidence items</b>.
                                      <br/>
                                      <span style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, display: 'inline-block' }}>
                                        Involved: {timelineItem.specialists.join(', ')}
                                      </span>
                                   </>
                                ) : timelineItem.note}
                             </p>
                          </div>
                       </motion.div>
                     )
                  })}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'evidence' && (
          <div className="card" style={{ padding: 24 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
               <h2 style={{ fontSize: 20, margin: 0 }}>Evidence & Records</h2>
               <button
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate(`/app/reports?returnTo=/app/cases/${item.id}`)}
                >
                  <FileText size={14} /> Add new evidence
                </button>
             </div>
             {records.length ? (
               <div style={{ display: 'grid', gap: 12 }}>
                {records.map((record) => (
                  <div
                    key={record.id}
                    style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}
                  >
                    <strong style={{ fontSize: 14 }}>{record.filename}</strong>
                    <p style={{ color: '#64748b', fontSize: 13, margin: '6px 0 0' }}>
                      {record.findings}
                    </p>
                  </div>
                ))}
               </div>
              ) : (
                <p style={{ color: '#64748b', margin: 0 }}>
                  No supporting records were added to this case yet.
                </p>
              )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <SnapshotViewer item={item} />
        )}

        {activeTab === 'actions' && (
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 20, margin: '0 0 16px' }}>Care Plan & Actions</h2>
            {item.actions.length ? (
              <div style={{ display: 'grid', gap: 12 }}>
              {item.actions.map((action) => (
                <div
                  key={action.id}
                  style={{
                    width: '100%',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    background: action.status === 'completed' ? '#f0fdfa' : '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                  }}
                >
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1 }}
                    onClick={() => {
                      toggleCaseAction(item.id, action.id);
                      refresh();
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 99,
                        flexShrink: 0,
                        border: `2px solid ${action.status === 'completed' ? '#10b981' : '#cbd5e1'}`,
                        background: action.status === 'completed' ? '#10b981' : 'transparent',
                      }}
                    />
                    <span>
                      <strong
                        style={{
                          fontSize: 14,
                          display: 'block',
                          textDecoration: action.status === 'completed' ? 'line-through' : 'none',
                          color: action.status === 'completed' ? '#065f46' : '#0f172a'
                        }}
                      >
                        {action.step}
                      </strong>
                      <small style={{ color: '#64748b' }}>
                        {action.timeline || 'No timing set'} · {action.type || 'Next step'}
                      </small>
                    </span>
                  </div>

                  <button 
                    onClick={() => setSimulatorAction(action)}
                    style={{ background: '#eff6ff', color: '#3b82f6', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                  >
                    <GitMerge size={14} />
                    Simulate Path
                  </button>
                </div>
              ))}
              </div>
            ) : (
              <p style={{ color: '#64748b' }}>No action plan yet. Complete a review to generate next steps.</p>
            )}
          </div>
        )}

        <AnimatePresence>
          {simulatorAction && (
            <PathwaySimulator 
              actionItem={simulatorAction} 
              onClose={() => setSimulatorAction(null)} 
            />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

function CaseCard({ item, navigate }: { item: CaseItem, navigate: any }) {
  const pending = item.actions.filter((a) => a.status !== 'completed').length;
  const primary = item.currentSummary?.topDiagnoses?.[0];
  const isMobile = useIsMobile();
  return (
    <article
      className="card"
      style={{
        padding: 20,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 16,
        alignItems: isMobile ? 'stretch' : 'center',
      }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            display: 'grid',
            placeItems: 'center',
            background: '#ecfdf5',
            color: '#059669',
            flexShrink: 0,
          }}
        >
          <Archive size={21} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <strong style={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden' }}>{item.title}</strong>
            <span className="badge badge-navy" style={{ flexShrink: 0 }}>
               {item.currentStage.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <p style={{ margin: '5px 0', color: '#64748b', fontSize: 13, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {primary?.condition
              ? `Leading pathway: ${primary.condition}`
              : 'Awaiting evidence synthesis'}
          </p>
          <small style={{ color: '#94a3b8', display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            <CalendarClock size={12} style={{ verticalAlign: 'middle' }} /> Updated{' '}
            {formatDate(item.updatedAt)} · {pending} actions open
          </small>
        </div>
      </div>
      <button
        className="btn btn-primary btn-sm"
        style={{ width: 'auto', flexShrink: 0, marginTop: isMobile ? '8px' : '0', alignSelf: isMobile ? 'flex-start' : 'auto' }}
        onClick={() => {
          setActiveCase(item.id);
          navigate(`/app/cases/${item.id}`);
        }}
      >
        Open case
      </button>
    </article>
  );
}

function EmptyAction({ navigate }: { navigate: any }) {
  return (
    <div
      style={{
        padding: 28,
        border: '1px dashed #cbd5e1',
        borderRadius: 14,
        color: '#64748b',
        textAlign: 'center',
      }}
    >
      Your next action will appear after a Quick Consult assessment.{' '}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/consult')}>
        Start one now
      </button>
    </div>
  );
}

function EmptyCase({ navigate }: { navigate: any }) {
  return (
    <div className="card" style={{ padding: 36, textAlign: 'center' }}>
      <Stethoscope size={28} color="#10B981" />
      <h3 style={{ margin: '12px 0 6px' }}>Start your first health case</h3>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 18px' }}>
        A case is the permanent container for your health journey. Add evidence and invite AI specialists to build a clinical picture.
      </p>
      <button className="btn btn-primary" onClick={() => navigate('/app/consult')}>
        Start Quick Consult <ArrowRight size={16} />
      </button>
    </div>
  );
}

function PrintableDossier({ item, profile }: { item: CaseItem; profile: any }) {
  const isMobile = window.innerWidth <= 768; // simple fallback for printable component

  const pendingActions = (item.actions || []).filter(a => a.status !== 'completed');
  
  return (
    <div className="print-only" style={{ display: 'none', padding: '20px 40px', maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '3px solid #000', paddingBottom: 20, marginBottom: 30 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: '0 0 8px', fontSize: isMobile ? 22 : 28, letterSpacing: '-0.5px' }}>CLINICAL DOSSIER: {item.title.toUpperCase()}</h1>
            <p style={{ margin: 0, fontSize: 16, color: '#4b5563' }}>
              Generated by HealthChain Navigator on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{profile.demographics.name}</div>
            <div style={{ color: '#4b5563', fontSize: 14 }}>
              DOB: {profile.demographics.dob || 'N/A'} • {profile.demographics.gender || 'N/A'}
            </div>
            <div style={{ color: '#4b5563', fontSize: 14 }}>
              Blood Group: {profile.demographics.bloodGroup || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div style={{ marginBottom: 24 }} className="print-avoid-break">
        <h2 style={{ fontSize: 20, borderBottom: '1px solid #e5e7eb', paddingBottom: 8, marginBottom: 16 }}>1. CASE OVERVIEW & PATHWAYS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 30 }}>
          <div>
            <h3 style={{ fontSize: 16, color: '#374151', margin: '0 0 8px' }}>Executive Summary</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: '#1f2937', margin: 0 }}>
              {item.currentSummary?.executiveSummary || 'A comprehensive multi-specialist investigation is ongoing.'}
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: 16, color: '#374151', margin: '0 0 8px' }}>Active Clinical Pathways</h3>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.6 }}>
              {Array.isArray(item.currentSummary?.topDiagnoses) && item.currentSummary.topDiagnoses.length > 0 ? (
                item.currentSummary.topDiagnoses.map((p, i) => (
                  <li key={i}><strong>{p.condition}</strong> - {p.specialty || 'General'}</li>
                ))
              ) : (
                <li>No active diagnostic pathways</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Action Plan Section */}
      <div style={{ marginBottom: 24 }} className="print-avoid-break">
        <h2 style={{ fontSize: 20, borderBottom: '1px solid #e5e7eb', paddingBottom: 8, marginBottom: 16 }}>2. CLINICAL ACTION PLAN</h2>
        <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 16, color: '#0f172a', margin: '0 0 12px' }}>Outstanding Items</h3>
          {pendingActions.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.6, color: '#1e293b' }}>
              {pendingActions.map(a => (
                <li key={a.id} style={{ marginBottom: 6 }}>
                  <strong>{a.step}</strong> {a.timeline ? `- ${a.timeline}` : ''}
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Recommended by {a.type || 'Deep Collab'}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>No pending clinical actions.</p>
          )}
        </div>
      </div>

      {/* Timeline Section */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, borderBottom: '1px solid #e5e7eb', paddingBottom: 8, marginBottom: 16 }}>3. CLINICAL TIMELINE & CONSENSUS SNAPSHOTS</h2>
        <div style={{ paddingLeft: 10 }}>
          {([...(item.events || []), ...(item.reviews || [])].sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())).map((timelineItem: any, i) => {
            const isReview = !!timelineItem.type && !timelineItem.label;
            const date = timelineItem.date || timelineItem.createdAt;
            return (
              <div key={i} className="print-avoid-break" style={{ marginBottom: 20, borderLeft: '3px solid #cbd5e1', paddingLeft: 16, position: 'relative' }}>
                <div style={{ position: 'absolute', left: -9, top: 0, width: 14, height: 14, borderRadius: '50%', background: isReview ? '#000' : '#94a3b8', border: '2px solid #fff' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <strong style={{ fontSize: 15, color: '#111827' }}>
                    {isReview ? (timelineItem.type === 'mdt' ? 'Deep Collab Snapshot' : 'Quick Consult Snapshot') : timelineItem.label}
                  </strong>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{formatDate(date)}</span>
                </div>
                {isReview ? (
                  <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
                    <div><strong>Specialists Involved:</strong> {timelineItem.specialists.join(', ')}</div>
                    <div style={{ marginTop: 8 }}><strong>Synthesized Findings:</strong></div>
                    <p style={{ margin: '4px 0 0 0' }}>This snapshot synthesized findings from {timelineItem.basedOn.evidenceIds.length} pieces of clinical evidence.</p>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 14, color: '#4b5563' }}>{timelineItem.note}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 50, paddingTop: 20, borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
        <strong>HealthChain AI</strong> — Not medical advice. This document is intended to facilitate discussion with a qualified healthcare professional.
      </div>
    </div>
  );
}
