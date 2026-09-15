import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CalendarClock, GitMerge, CheckCircle2, ChevronRight, Archive, Trash2, Sparkles, Users, AlertTriangle, BrainCircuit } from 'lucide-react';
import { getCases, CaseItem, deleteCase } from '../../services/CaseEngine';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useToast } from '../../components/ui/ToastProvider';
import Skeleton from '../../components/ui/Skeleton';
import { InfiniteHealthCanvas } from '../../components/ui/InfiniteHealthCanvas';
import { caseMatchesSearch } from '../../services/caseWorkspace';
import '../../components/ui/caseWorkspace.css';
import { NewCaseForm } from '../../components/ui/NewCaseForm';

const formatDate = (value: string) => {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'N/A';
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  } catch {
    return 'N/A';
  }
};

export default function MyCases() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const toast = useToast();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams] = useSearchParams();
  const [showNewCase, setShowNewCase] = useState(() => searchParams.get('new') === 'true');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [caseToDelete, setCaseToDelete] = useState<CaseItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'canvas'>('list');
  const itemsPerPage = 5;

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refresh = () => {
      setCases([...getCases()].sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0)));
      setIsLoading(false);
    };
    
    refresh();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('hc_cases_updated', refresh);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('hc_cases_updated', refresh);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && caseToDelete) {
        setCaseToDelete(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [caseToDelete]);

  const filteredCases = cases.filter(c => (statusFilter === 'all' || c.status === statusFilter) && caseMatchesSearch(c, searchTerm));
  const totalPages = Math.max(1, Math.ceil(filteredCases.length / itemsPerPage));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedCases = filteredCases.slice((visiblePage - 1) * itemsPerPage, visiblePage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);
  return (
    <div className="connected-experience" style={{ maxWidth: 1020, margin: '0 auto', paddingBottom: 24 }}>
      <header style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ fontSize: isMobile ? 26 : 32, margin: 0, letterSpacing: '-1.2px' }}>My Cases</h1>
        <button type="button" className="btn btn-primary" onClick={() => setShowNewCase(true)}>New case</button>
      </header>
      {showNewCase && <NewCaseForm onCancel={() => setShowNewCase(false)} onCreated={id => navigate(`/app/cases/${id}`)} />}


      {!isLoading && cases.length >= 1 && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#F1F5F9', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
            <button onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'} style={{ background: viewMode === 'list' ? '#FFFFFF' : 'transparent', color: viewMode === 'list' ? '#0F172A' : '#64748B', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, boxShadow: viewMode === 'list' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}>List</button>
            <button onClick={() => setViewMode('canvas')} aria-pressed={viewMode === 'canvas'} style={{ background: viewMode === 'canvas' ? '#FFFFFF' : 'transparent', color: viewMode === 'canvas' ? '#0F172A' : '#64748B', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, boxShadow: viewMode === 'canvas' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}>Canvas</button>
          </div>

          {viewMode === 'canvas' && (
            <div style={{ marginBottom: '24px' }}>
              <InfiniteHealthCanvas cases={cases} />
            </div>
          )}
        </>
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <label style={{ color: '#475569', fontSize: 13 }}>Show
          <select className="case-context-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="active">Active cases</option><option value="archived">Archived cases</option><option value="all">All cases</option>
          </select>
        </label>
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by condition, title..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label="Search cases by condition or title"
            style={{
              width: '100%',
              padding: '12px 14px 12px 40px',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              fontSize: 15,
              outline: 'none'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: isMobile ? 12 : 16, border: '1px solid #E8EEF5', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: 16, borderRadius: 20, background: '#FFF' }}>
              <Skeleton width={52} height={52} borderRadius={16} />
              <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                <Skeleton width="60%" height={24} borderRadius={4} style={{ marginBottom: 8 }} />
                <Skeleton width="40%" height={16} borderRadius={4} />
              </div>
            </div>
          ))
        ) : paginatedCases.length > 0 ? (
          paginatedCases.map(caseItem => {
            const primary = caseItem.currentSummary?.topDiagnoses?.[0];
            const isJarvis = caseItem.mode === 'jarvis' || caseItem.currentStage === 'jarvis_complete' || caseItem.reviews?.[0]?.type === 'jarvis' || caseItem.title?.toLowerCase().includes('clinical data engine') || caseItem.title?.toLowerCase().includes('j.a.r.v.i.s.');
            const isQuick = caseItem.title?.toLowerCase().includes('quick consult') || caseItem.reviews?.[0]?.type === 'parallel';

            let badgeBg = '#F0FDFA';
            let badgeColor = '#0F766E';
            let badgeBorder = '#99F6E4';
            let badgeLabel = 'Collaborative Board';
            let iconBg = '#F0FDFA';
            let iconColor = '#10B981';
            let IconComponent = Users;

            if (isJarvis) {
              badgeBg = '#FFF7ED';
              badgeColor = '#C2410C';
              badgeBorder = '#FED7AA';
              badgeLabel = 'Clinical Review';
              iconBg = '#FFF7ED';
              iconColor = '#EA580C';
              IconComponent = BrainCircuit;
            } else if (isQuick) {
              badgeBg = '#EFF6FF';
              badgeColor = '#1D4ED8';
              badgeBorder = '#BFDBFE';
              badgeLabel = 'Specialist Consult';
              iconBg = '#EFF6FF';
              iconColor = '#3B82F6';
              IconComponent = GitMerge;
            }

            return (
              <div 
                 key={caseItem.id}
                 role="button"
                 tabIndex={0}
                 aria-label={`View clinical case: ${caseItem.title}`}
                 onKeyDown={(e) => {
                    if ((e.target as HTMLElement).closest('button, a')) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/app/cases/${caseItem.id}`);
                    }
                 }}
                 className="card" 
                 onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    navigate(`/app/cases/${caseItem.id}`);
                 }}
                 style={{ padding: isMobile ? 12 : 16, cursor: 'pointer', transition: 'all 0.2s ease', border: '1px solid #E8EEF5', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: 16, borderRadius: 20, background: '#FFF', boxShadow: '0 4px 12px rgba(15,23,42,.02)', minWidth: 0 }}
                 onMouseEnter={e => { e.currentTarget.style.borderColor = '#5EEAD4'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 24px rgba(15,23,42,.05)'; }}
                 onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EEF5'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,.02)'; }}
              >
                 <div style={{ width: 52, height: 52, borderRadius: 16, background: iconBg, color: iconColor, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <IconComponent size={24} />
                 </div>
                 <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                       <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}`, padding: '2px 8px', borderRadius: 999 }}>
                              {badgeLabel}
                            </span>
                          </div>
                          <h3 style={{ margin: '0 0 6px', fontSize: 18, color: '#0F172A' }}>{caseItem.title}</h3>
                          <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>
                            {primary?.condition ? `AI consideration: ${primary.condition}` : 'Draft — add your story and records when ready'}
                          </p>
                       </div>
                       <span className="badge badge-teal" style={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                         {(caseItem.currentStage || 'gathering_evidence').replace(/_/g, ' ')}
                       </span>
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 8 : 24, marginTop: 16, color: '#64748b', fontSize: 13, alignItems: 'center' }}>
                       <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <CalendarClock size={14} /> Updated {formatDate(caseItem.updatedAt)}
                       </span>
                       <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <GitMerge size={14} /> {caseItem.reviews.length} Snapshots
                       </span>
                       {caseItem.actions.length > 0 && (
                          <span style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#10B981' }}>
                             <CheckCircle2 size={14} /> {caseItem.actions.filter(a => a.status === 'completed').length} / {caseItem.actions.length} Actions
                          </span>
                       )}
                    </div>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: isMobile ? 'flex-end' : 'center' }}>
                   <Link
                     to={`/app/ava?caseId=${encodeURIComponent(caseItem.id)}`}
                     state={{ initialPrompt: `Hi Ava, let's review my case: "${caseItem.title}". Please separate what I reported, what the records say, what remains unknown, and useful questions for my clinician.` }}
                     aria-label={`Discuss ${caseItem.title} with Ava`}
                     onClick={(e) => e.stopPropagation()}
                     style={{
                       background: '#EEF2FF',
                       border: '1px solid #C7D2FE',
                       borderRadius: '10px',
                       padding: '6px 12px',
                       color: '#4F46E5',
                       fontSize: '12px',
                       fontWeight: 700,
                       cursor: 'pointer',
                       display: 'flex',
                       alignItems: 'center',
                       gap: '4px',
                       transition: 'all 0.15s'
                     }}
                   >
                     <Sparkles size={13} /> Ask Ava
                   </Link>
                   <button
                     aria-label="Delete case"
                     onClick={(e) => {
                       e.stopPropagation();
                       setCaseToDelete(caseItem);
                     }}
                     style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', color: '#ef4444' }}
                   >
                     <Trash2 size={20} />
                   </button>
                   <ChevronRight size={20} color="#cbd5e1" />
                 </div>
               </div>
            );
          })
        ) : (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
            <Archive size={40} color="#cbd5e1" style={{ marginBottom: 16 }} />
            <h3 style={{ margin: '0 0 8px', color: '#0F172A' }}>{cases.length ? 'No matching cases' : 'No cases yet'}</h3>
            <p style={{ margin: '0 0 24px' }}>{cases.length ? 'Try a different title, condition, document name, or case filter.' : 'Record symptoms, documents, and clinician discussion questions to start a case.'}</p>
            {cases.length > 0 && <button className="btn btn-outline" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>Clear filters</button>}
            <button className="btn btn-primary" onClick={() => { setShowNewCase(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Start a New Case</button>
          </div>
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 }}>
          <button 
            className="btn btn-outline btn-sm" 
            disabled={visiblePage === 1}
            onClick={() => setCurrentPage(Math.max(1, visiblePage - 1))}
          >
            Previous
          </button>
          <span aria-live="polite" style={{ fontSize: 14, color: '#64748b' }}>Page {visiblePage} of {totalPages}</span>
          <button 
            className="btn btn-outline btn-sm" 
            disabled={visiblePage === totalPages}
            onClick={() => setCurrentPage(Math.min(totalPages, visiblePage + 1))}
          >
            Next
          </button>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {caseToDelete && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setCaseToDelete(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Delete Clinical Case"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                padding: isMobile ? '24px 20px' : '32px 28px',
                maxWidth: '440px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                border: '1px solid #F1F5F9'
              }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <AlertTriangle size={24} />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#0F172A', fontWeight: 700 }}>
                Delete Clinical Case?
              </h3>
              <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#64748B', lineHeight: 1.5 }}>
                Are you sure you want to delete <strong style={{ color: '#0F172A' }}>"{caseToDelete.title}"</strong>? This will permanently remove all associated consensus reports and differential notes.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setCaseToDelete(null)}
                  style={{ flex: 1, padding: '10px 16px', borderRadius: '12px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteCase(caseToDelete.id);
                    setCases([...getCases()]);
                    toast.success('Case Deleted', 'The selected case record has been removed.');
                    setCaseToDelete(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '12px',
                    background: '#EF4444',
                    color: '#FFF',
                    border: 'none',
                    fontWeight: 650,
                    cursor: 'pointer'
                  }}
                >
                  Delete Case
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </div>
  );
}
