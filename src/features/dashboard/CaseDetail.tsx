import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, CalendarClock, GitMerge, Brain, FileText, 
  Stethoscope, MessageSquare, Clock, FolderOpen, AlertCircle
} from 'lucide-react';
import { getCase, getActiveCaseId, setActiveCase, CaseItem } from '../../services/CaseEngine';
import { getProfile } from '../../services/ProfileEngine';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useToast } from '../../components/ui/ToastProvider';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import SnapshotViewer from './SnapshotViewer';
import DDxBoard from './DDxBoard';
import InvestigationBoard from '../../components/ui/InvestigationBoard';

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'N/A';
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  } catch {
    return 'N/A';
  }
};

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'reviews' | 'map' | 'records'>('reviews');
  const [caseItem, setCaseItem] = useState<CaseItem | undefined>(undefined);
  const [activeCaseId, setActiveCaseIdState] = useState<string | null>(null);

  const caseAnalysis = React.useMemo(() => {
    if (!caseItem) return null;
    if (caseItem.currentSummary?.flowchart) return caseItem.currentSummary;
    const reviewWithFlowchart = caseItem.reviews?.find(r => r.report?.flowchart);
    if (reviewWithFlowchart) return reviewWithFlowchart.report;

    const topDiagnoses = caseItem.currentSummary?.topDiagnoses || caseItem.reviews?.[0]?.report?.topDiagnoses;
    if (topDiagnoses && topDiagnoses.length > 0) {
      const primary = topDiagnoses[0];
      const conditionName = typeof primary === 'string' ? primary : primary.condition || caseItem.title;
      const specialtyName = typeof primary === 'string' ? 'Specialist Review' : primary.specialty || 'Leading Pathway';
      const rationaleText = typeof primary === 'string' ? 'Cross-system physiological interaction' : primary.rationale || 'Interconnected symptom mechanisms';
      return {
        chain_name: conditionName,
        normal_terms_explanation: caseItem.currentSummary?.executiveSummary || caseItem.reviews?.[0]?.report?.executiveSummary || 'Clinical review findings and potential pathways to evaluate with your physician.',
        flowchart: {
          root: conditionName,
          root_sub: specialtyName,
          mechanism: rationaleText,
          mechanism_sub: 'Targeted clinical area to evaluate',
          symptoms: (caseItem.intakeData?.symptoms || ['Reported clinical indications']).map((s: string) => ({ name: s, sub: 'Reported sign' }))
        }
      };
    }
    return null;
  }, [caseItem]);

  useEffect(() => {
    if (!id) return;
    const item = getCase(id);
    setCaseItem(item);
    setActiveCaseIdState(getActiveCaseId());
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        triggerHapticLight();
        navigate('/app/my-cases');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleMakeActive = () => {
    if (!caseItem) return;
    triggerHapticSuccess();
    setActiveCase(caseItem.id);
    setActiveCaseIdState(caseItem.id);
    awardPoints(5, `Active Workspace: ${caseItem.title.slice(0, 25)}`, 'lifestyle');
    toast.success('Workspace Set to Active', `"${caseItem.title}" is now your active clinical context across HealthChain.`);
  };

  if (!caseItem) {
    return (
      <div style={{ maxWidth: 1000, margin: '40px auto', padding: '0 20px', textAlign: 'center' }}>
        <div className="card" style={{ padding: '48px 24px', borderRadius: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEF2F2', color: '#EF4444', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
            <AlertCircle size={32} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>Case Not Found</h2>
          <p style={{ color: '#64748B', maxWidth: 440, margin: '0 auto 24px', fontSize: 15, lineHeight: 1.5 }}>
            We could not locate the clinical record or consultation for ID <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 6 }}>{id}</code>. It may have been archived or removed.
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/app/my-cases')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: '0 auto' }}
          >
            <ArrowLeft size={16} /> Return to My Cases
          </button>
        </div>
      </div>
    );
  }

  const profile = getProfile();
  const reviewsCount = caseItem.reviews?.length || 0;
  const recordsCount = caseItem.medicalRecords?.length || 0;
  const isCurrentActive = activeCaseId === caseItem.id;

  return (
    <div style={{ 
      maxWidth: 1180, 
      margin: '0 auto', 
      padding: isMobile ? '16px 12px 60px' : '24px 20px 60px',
      minHeight: '100vh' 
    }}>
      {/* Back to Cases Link */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => { triggerHapticLight(); navigate('/app/my-cases'); }}
          style={{
            background: 'none',
            border: 'none',
            color: '#475569',
            fontSize: 14,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            padding: '6px 0'
          }}
        >
          <ArrowLeft size={16} /> Back to My Cases
        </button>
      </div>

      {/* Case Header Hero */}
      <div className="card" style={{ 
        padding: isMobile ? '20px 16px' : '28px 32px', 
        borderRadius: 24, 
        marginBottom: 24,
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 20px rgba(15,23,42,0.03)'
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: 20 
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ 
                fontSize: 12, 
                fontWeight: 700, 
                padding: '4px 10px', 
                borderRadius: 999, 
                background: caseItem.mode === 'mdt' ? '#EFF6FF' : '#ECFDF5', 
                color: caseItem.mode === 'mdt' ? '#1D4ED8' : '#047857',
                border: `1px solid ${caseItem.mode === 'mdt' ? '#BFDBFE' : '#A7F3D0'}`
              }}>
                {caseItem.mode === 'mdt' ? 'Deep Collab MDT' : 'Clinical Consultation'}
              </span>
              <span className="badge badge-teal" style={{ textTransform: 'capitalize' }}>
                Stage: {caseItem.currentStage.replace(/_/g, ' ')}
              </span>
              {isCurrentActive ? (
                <span style={{ fontSize: 12, fontWeight: 700, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', padding: '3px 10px', borderRadius: 999 }}>
                  🎯 Active Workspace
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleMakeActive}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: 999,
                    padding: '3px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  Set as Active
                </button>
              )}
            </div>

            <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              {caseItem.title}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#64748B', fontSize: 13, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} /> Created {formatDate(caseItem.createdAt)}
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarClock size={14} /> Last Update {formatDate(caseItem.updatedAt)}
              </span>
              <span>•</span>
              <span>ID: <code style={{ color: '#0284C7' }}>{caseItem.id}</code></span>
            </div>
          </div>

          {/* Quick Doctor Prep & Ava Action Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
            <button
              onClick={() => {
                triggerHapticLight();
                navigate(`/app/case-prep?caseId=${caseItem.id}`);
              }}
              className="btn btn-primary"
              style={{
                flex: isMobile ? 1 : 'unset',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 12
              }}
            >
              <Stethoscope size={16} /> Prepare for Doctor
            </button>
            <button
              onClick={() => {
                triggerHapticLight();
                navigate('/app/ava', {
                  state: {
                    initialPrompt: `I would like to discuss my case: "${caseItem.title}". What are the key findings and next steps to keep in mind?`
                  }
                });
              }}
              className="btn btn-outline"
              style={{
                flex: isMobile ? 1 : 'unset',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 12,
                borderColor: '#CBD5E1',
                color: '#0F172A',
                background: '#F8FAFC'
              }}
            >
              <MessageSquare size={16} color="#0284C7" /> Discuss with Ava
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div 
          role="tablist"
          aria-label="Clinical Case Views"
          style={{ 
            display: 'flex', 
            borderBottom: '1px solid #E2E8F0', 
            marginTop: 24, 
            gap: isMobile ? 12 : 24,
            overflowX: 'auto',
            paddingBottom: 2
          }}
        >
          <button
            role="tab"
            aria-selected={activeTab === 'reviews'}
            onClick={() => { triggerHapticLight(); setActiveTab('reviews'); }}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 4px',
              fontSize: 15,
              fontWeight: activeTab === 'reviews' ? 700 : 500,
              color: activeTab === 'reviews' ? '#0F766E' : '#64748B',
              borderBottom: activeTab === 'reviews' ? '3px solid #0F766E' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap'
            }}
          >
            <GitMerge size={16} /> Reviews & Timeline
            <span style={{ 
              fontSize: 11, 
              padding: '2px 6px', 
              borderRadius: 999, 
              background: activeTab === 'reviews' ? '#CCFBF1' : '#F1F5F9',
              color: activeTab === 'reviews' ? '#0F766E' : '#64748B',
              fontWeight: 700
            }}>
              {reviewsCount}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'map'}
            onClick={() => { triggerHapticLight(); setActiveTab('map'); }}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 4px',
              fontSize: 15,
              fontWeight: activeTab === 'map' ? 700 : 500,
              color: activeTab === 'map' ? '#0F766E' : '#64748B',
              borderBottom: activeTab === 'map' ? '3px solid #0F766E' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap'
            }}
          >
            <Brain size={16} /> AI Connection Map
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'records'}
            onClick={() => { triggerHapticLight(); setActiveTab('records'); }}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 4px',
              fontSize: 15,
              fontWeight: activeTab === 'records' ? 700 : 500,
              color: activeTab === 'records' ? '#0F766E' : '#64748B',
              borderBottom: activeTab === 'records' ? '3px solid #0F766E' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap'
            }}
          >
            <FolderOpen size={16} /> Evidence & Records
            <span style={{ 
              fontSize: 11, 
              padding: '2px 6px', 
              borderRadius: 999, 
              background: activeTab === 'records' ? '#CCFBF1' : '#F1F5F9',
              color: activeTab === 'records' ? '#0F766E' : '#64748B',
              fontWeight: 700
            }}>
              {recordsCount}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Reviews & Timeline */}
      {activeTab === 'reviews' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <SnapshotViewer item={caseItem} />
        </motion.div>
      )}

      {/* Tab 2: AI Connection Map */}
      {activeTab === 'map' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <DDxBoard item={caseItem} profile={profile} />
          {caseAnalysis && (
            <div style={{ marginTop: 24 }}>
              <InvestigationBoard analysis={caseAnalysis} />
            </div>
          )}
        </motion.div>
      )}

      {/* Tab 3: Evidence & Medical Records */}
      {activeTab === 'records' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div className="card" style={{ padding: isMobile ? 16 : 28, borderRadius: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#0F172A' }}>Attached Case Records</h2>
                <p style={{ margin: 0, color: '#64748B', fontSize: 14 }}>Clinical lab tests, imaging, and external documents attached to this case.</p>
              </div>
              <button
                className="btn btn-outline"
                style={{ padding: '8px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => {
                  setActiveCase(caseItem.id);
                  navigate(`/app/medicine-lab?caseId=${encodeURIComponent(caseItem.id)}&returnTo=${encodeURIComponent('/app/cases/' + caseItem.id)}#clinical-report-analyzer`);
                }}
              >
                <FileText size={15} /> Interpret New Report
              </button>
            </div>

            {recordsCount === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 16px', background: '#F8FAFC', borderRadius: 16, border: '1px dashed #CBD5E1' }}>
                <FolderOpen size={36} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#334155', margin: '0 0 6px' }}>No records uploaded directly yet</h3>
                <p style={{ color: '#64748B', fontSize: 14, margin: '0 0 16px', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
                  You can upload lab reports, discharge summaries, or imaging notes to attach them to this case's synthesis.
                </p>
                <button
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                  onClick={() => {
                    setActiveCase(caseItem.id);
                    navigate(`/app/medicine-lab?caseId=${encodeURIComponent(caseItem.id)}&returnTo=${encodeURIComponent('/app/cases/' + caseItem.id)}#clinical-report-analyzer`);
                  }}
                >
                  Upload Clinical Record
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {caseItem.medicalRecords.map((record) => (
                  <div
                    key={record.id}
                    style={{
                      display: 'flex',
                      alignItems: isMobile ? 'flex-start' : 'center',
                      flexDirection: isMobile ? 'column' : 'row',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '16px 20px',
                      background: '#F8FAFC',
                      borderRadius: 12,
                      border: '1px solid #E2E8F0'
                    }}
                  >
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EFF6FF', color: '#2563EB', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <FileText size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 15 }}>{record.filename}</div>
                        <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                          {record.findings || 'Report findings processed by HealthChain Engine.'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, alignSelf: isMobile ? 'flex-end' : 'center' }}>
                      <span className="badge" style={{ background: '#E2E8F0', color: '#334155', textTransform: 'capitalize' }}>
                        {record.type || 'Report'}
                      </span>
                      <small style={{ color: '#94A3B8' }}>{formatDate(record.addedAt)}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
