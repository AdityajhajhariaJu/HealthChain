import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CalendarClock, GitMerge, CheckCircle2, ChevronRight, Archive, ClipboardList, FileText, Trash2 } from 'lucide-react';
import { getCases, CaseItem, deleteCase } from '../../services/CaseEngine';
import { useIsMobile } from '../../hooks/useIsMobile';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));

export default function MyCases() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseItem[]>(getCases());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const refresh = () => setCases(getCases());
    window.addEventListener('hc_cases_updated', refresh);
    return () => window.removeEventListener('hc_cases_updated', refresh);
  }, []);

  const filteredCases = cases.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));
  const openActions = cases.reduce((total, item) => total + item.actions.filter(action => action.status !== 'completed').length, 0);
  const evidenceItems = cases.reduce((total, item) => total + (item.medicalRecords?.length || 0), 0);

  return (
    <div style={{ maxWidth: 1020, margin: '0 auto', paddingBottom: 60 }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ color: '#0f9488', fontWeight: 800, fontSize: 12, letterSpacing: '.9px', marginBottom: 10 }}>YOUR CASEWORK</div>
        <h1 style={{ fontSize: 36, margin: '0 0 10px', letterSpacing: '-1.2px' }}>My Cases</h1>
        <p style={{ color: '#64748b', fontSize: 16, margin: 0 }}>
          Your ongoing health records, specialist reviews, and next steps.
        </p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 26 }}>
        {[
          { label: 'Active cases', value: cases.length, icon: Archive, color: '#0D9488', bg: '#F0FDFA' },
          { label: 'Open next steps', value: openActions, icon: ClipboardList, color: '#4F46E5', bg: '#EEF2FF' },
          { label: 'Evidence saved', value: evidenceItems, icon: FileText, color: '#B45309', bg: '#FFFBEB' },
        ].map((stat) => {
          const Icon = stat.icon;
          return <div key={stat.label} style={{ padding: '16px', borderRadius: 16, background: '#FFF', border: '1px solid #E8EEF5', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 24px rgba(15,23,42,.035)' }}>
            <div style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 12, background: stat.bg, color: stat.color }}><Icon size={18} /></div>
            <div><strong style={{ display: 'block', color: '#0F172A', fontSize: 18, lineHeight: 1 }}>{stat.value}</strong><span style={{ color: '#64748B', fontSize: 12, fontWeight: 650 }}>{stat.label}</span></div>
          </div>;
        })}
      </section>

      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: 16 }} />
          <input
            type="text"
            placeholder="Search cases by symptom or condition..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px 14px 44px',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              fontSize: 15,
              outline: 'none'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {filteredCases.map(caseItem => {
           const primary = caseItem.currentSummary?.topDiagnoses?.[0];
           return (
              <div 
                 key={caseItem.id}
                 className="card" 
                 onClick={() => navigate(`/app/cases/${caseItem.id}`)}
                 style={{ padding: isMobile ? 16 : 22, cursor: 'pointer', transition: 'all 0.2s ease', border: '1px solid #E8EEF5', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: 18, borderRadius: 20, background: '#FFF', boxShadow: '0 10px 28px rgba(15,23,42,.04)' }}
                 onMouseEnter={e => { e.currentTarget.style.borderColor = '#5EEAD4'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 18px 34px rgba(15,23,42,.09)'; }}
                 onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EEF5'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(15,23,42,.04)'; }}
              >
                 <div style={{ width: 52, height: 52, borderRadius: 16, background: '#F0FDFA', color: '#0D9488', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Archive size={24} />
                 </div>
                 <div style={{ flex: 1 }}>
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
                          <span style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#0d9488' }}>
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
        })}
        {filteredCases.length === 0 && (
           <div style={{ padding: 60, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
              <Archive size={40} color="#cbd5e1" style={{ marginBottom: 16 }} />
              <h3 style={{ margin: '0 0 8px' }}>No cases found</h3>
              <p style={{ margin: 0 }}>You don't have any cases matching your search.</p>
           </div>
        )}
      </div>
    </div>
  );
}
