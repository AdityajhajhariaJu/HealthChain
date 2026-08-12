import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CalendarClock, GitMerge, CheckCircle2, ChevronRight, Archive, ClipboardList, FileText, Trash2 } from 'lucide-react';
import { getCases, CaseItem, deleteCase } from '../../services/CaseEngine';
import { useIsMobile } from '../../hooks/useIsMobile';
import Skeleton from '../../components/ui/Skeleton';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));

export default function MyCases() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refresh = () => {
      setCases(getCases());
      setIsLoading(false);
    };
    
    // Simulate slight network delay for skeleton loader
    const timer = setTimeout(refresh, 500);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('hc_cases_updated', refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('hc_cases_updated', refresh);
    };
  }, []);

  const filteredCases = cases.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.ceil(filteredCases.length / itemsPerPage);
  const paginatedCases = filteredCases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  const openActions = cases.reduce((total, item) => total + item.actions.filter(action => action.status !== 'completed').length, 0);
  const evidenceItems = cases.reduce((total, item) => total + (item.medicalRecords?.length || 0), 0);

  const stats = [
    { label: 'Active cases', value: cases.length, icon: Archive, color: '#10B981', bg: '#F0FDFA' },
    { label: 'Open next steps', value: openActions, icon: ClipboardList, color: '#4F46E5', bg: '#EEF2FF' },
    { label: 'Evidence saved', value: evidenceItems, icon: FileText, color: '#B45309', bg: '#FFFBEB' },
  ];

  return (
    <div style={{ maxWidth: 1020, margin: '0 auto', paddingBottom: 24 }}>
      <header style={{ marginBottom: 16 }}>
        <div style={{ color: '#0f9488', fontWeight: 800, fontSize: 12, letterSpacing: '.9px', marginBottom: 6 }}>YOUR CASEWORK</div>
        <h1 style={{ fontSize: isMobile ? 26 : 32, margin: '0 0 4px', letterSpacing: '-1.2px' }}>My Cases</h1>
        <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
          Manage your ongoing medical cases and multi-specialist discussions.
        </p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return <div key={stat.label} style={{ padding: '12px', borderRadius: 16, background: '#FFF', border: '1px solid #E8EEF5', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 12px rgba(15,23,42,.02)' }}>
            <div style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 12, background: stat.bg, color: stat.color }}><Icon size={18} /></div>
            <div><strong style={{ display: 'block', color: '#0F172A', fontSize: 18, lineHeight: 1 }}>{stat.value}</strong><span style={{ color: '#64748B', fontSize: 12, fontWeight: 650 }}>{stat.label}</span></div>
          </div>;
        })}
      </section>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
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
            placeholder="Search by diagnosis, title..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
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
            return (
              <div 
                 key={caseItem.id}
                 className="card" 
                 onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    navigate(`/app/cases/${caseItem.id}`);
                 }}
                 style={{ padding: isMobile ? 12 : 16, cursor: 'pointer', transition: 'all 0.2s ease', border: '1px solid #E8EEF5', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: 16, borderRadius: 20, background: '#FFF', boxShadow: '0 4px 12px rgba(15,23,42,.02)', minWidth: 0 }}
                 onMouseEnter={e => { e.currentTarget.style.borderColor = '#5EEAD4'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 24px rgba(15,23,42,.05)'; }}
                 onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EEF5'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,.02)'; }}
              >
                 <div style={{ width: 52, height: 52, borderRadius: 16, background: '#F0FDFA', color: '#10B981', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Archive size={24} />
                 </div>
                 <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                       <div>
                          <h3 style={{ margin: '0 0 6px', fontSize: 18, color: '#0F172A' }}>{caseItem.title}</h3>
                          <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>
                            {primary?.condition ? `Leading pathway: ${primary.condition}` : 'Awaiting evidence synthesis'}
                          </p>
                       </div>
                       <span className="badge badge-teal" style={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                         {caseItem.currentStage.replace('_', ' ')}
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
                 <button
                   aria-label="Delete case"
                   onClick={(e) => {
                     e.stopPropagation();
                     if (window.confirm('Are you sure you want to delete this case?')) {
                       deleteCase(caseItem.id);
                       setCases(getCases());
                     }
                   }}
                   style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', color: '#ef4444' }}
                 >
                   <Trash2 size={20} />
                 </button>
                 <ChevronRight size={20} color="#cbd5e1" />
              </div>
            );
          })
        ) : (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
            <Archive size={40} color="#cbd5e1" style={{ marginBottom: 16 }} />
            <h3 style={{ margin: '0 0 8px', color: '#0F172A' }}>No cases found</h3>
            <p style={{ margin: '0 0 24px' }}>You don't have any cases matching your search.</p>
            <button className="btn btn-primary" onClick={() => navigate('/app/multi')}>
              Start a New Case
            </button>
          </div>
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 }}>
          <button 
            className="btn btn-outline btn-sm" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span style={{ fontSize: 14, color: '#64748b' }}>Page {currentPage} of {totalPages}</span>
          <button 
            className="btn btn-outline btn-sm" 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
