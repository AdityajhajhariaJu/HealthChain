import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Users,
  Network,
  Activity,
  ChevronLeft,
  RotateCcw,
  Play,
  Pause,
  CheckCircle2, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MDTReportPanel } from './MDTComponents';
import { SpecialistPanel } from './MultiSpecialistComponents';
import { saveReviewSnapshot, setActiveCase } from '../../services/CaseEngine';
import { getRunScope, clearRunStorage } from '../../services/RunContext';

const cachedMDTSpecialistStreams: any = {};

export function MDTHubDashboard({
  isMobile,
  activeCase,
  dashboardTab,
  setDashboardTab,
  intakeData,
  setIntakeData,
  selectedSpecialists,
  setSelectedSpecialists,
  specialistTranscripts,
  setSpecialistTranscripts,
  reviewRecords,
  historyReport,
  setHistoryReport,
  isSessionPaused,
  setIsSessionPaused,
  setPhase,
  mobileActiveTab,
  setMobileActiveTab,
  onSpecialistComplete
}) {
  const navigate = useNavigate();
    const [completedSpecialists, setCompletedSpecialists] = React.useState<Set<string>>(new Set());

  // Clear memory cache if case changes
  React.useEffect(() => {
    if (activeCase?.id) {
      const lastCaseKey = getRunScope('mdt', 'draft', 'last-case');
      const lastCaseId = sessionStorage.getItem(lastCaseKey);
      if (lastCaseId !== activeCase.id) {
        Object.keys(cachedMDTSpecialistStreams).forEach(k => delete cachedMDTSpecialistStreams[k]);
        clearRunStorage('mdt');
        sessionStorage.setItem(lastCaseKey, activeCase.id);
      }
    }
  }, [activeCase?.id]);

  return (
    <>
      

      

      {dashboardTab === 'specialists' ? (
        <>
          

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button
              onClick={() => {
                 setPhase('intake');
                 setIntakeData({ chiefComplaint: '', history: '', redFlags: false });
                 setHistoryReport(null);
              }}
              style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <X size={16} /> Cancel Consultation
            </button>
          </div>
          <div
            style={{
              maxWidth: '800px', margin: '0 auto', display: 'flex',
                flexDirection: 'column',
              gap: '16px',
              opacity: isSessionPaused ? 0.6 : 1,
              pointerEvents: isSessionPaused ? 'none' : 'auto',
              transition: 'all 0.3s'
            }}
          >
            <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', paddingBottom: '12px', WebkitOverflowScrolling: 'touch', flexWrap: 'wrap', justifyContent: 'center' }}>
                {selectedSpecialists.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setMobileActiveTab(i)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '99px',
                      whiteSpace: 'nowrap',
                      border: mobileActiveTab === i ? `1px solid ${s.color}` : '1px solid #E2E8F0',
                      background: mobileActiveTab === i ? s.color : '#FFF',
                      color: mobileActiveTab === i ? '#FFF' : '#64748B',
                      fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {selectedSpecialists.map((s, i) => {
              const Icon = s.icon;
              return (
              <div
                key={s.id}
                style={{
                  display: (mobileActiveTab === i) ? 'flex' : 'none',
                  flexDirection: 'column',
                  flex: 1,
                  width: '100%',
                  height: isMobile ? 'calc(100vh - 240px)' : 'calc(100vh - 300px)', minHeight: isMobile ? 'auto' : '600px', maxHeight: isMobile ? 'auto' : '800px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '16px' : '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '12px', background: s.bg || 'rgba(59, 130, 246, 0.1)', color: s.color || '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{s.label}</h3>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>AI-guided question preparation</div>
                    </div>
                  </div>
                </div>
                
                <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                  <SpecialistPanel
                    specialist={s}
                    isRunning={true}
                    isPaused={false}
                    index={i}
                    onComplete={(id: string, transcript: any) => {
                      if (onSpecialistComplete) {
                        onSpecialistComplete(id, transcript);
                      }
                    }}
                    allSpecialists={selectedSpecialists}
                    intakeData={intakeData}
                    activeDifferentials={activeCase?.differentials || []}
                    cachedSpecialistStreams={cachedMDTSpecialistStreams}
                    workflow="mdt"
                    caseId={activeCase?.id || 'draft'}
                    runId={activeCase?.updatedAt || 'session'}
                  />
                </div>
              </div>
            );
            })}
          </div>
        </>
      ) : (
        <MDTReportPanel
          intakeData={intakeData}
          specialistTranscripts={specialistTranscripts}
          medicalRecords={reviewRecords}
          initialReport={historyReport || activeCase?.currentSummary}
          onCaseSaved={async (report: any) => {
            saveReviewSnapshot({
              type: 'mdt',
              report,
              transcripts: specialistTranscripts,
              basedOnEvidenceIds: reviewRecords.map(r => r.id),
              specialists: selectedSpecialists.map((s) => s.label),
              caseId: activeCase?.id || '',
            });
          }}
          onRestart={() => {
              // 1. Wipe the module-level stream cache to prevent infinite compiling loops
              Object.keys(cachedMDTSpecialistStreams).forEach(key => delete cachedMDTSpecialistStreams[key]);
              
              // 2. Wipe the sessionStorage streams so the LLM doesn't hallucinate past cases
              clearRunStorage('mdt', activeCase?.id);
              sessionStorage.removeItem('hc_mdt_intake_draft');

              setActiveCase(null);
              setPhase('intake');
              setIntakeData({ chiefComplaint: '', history: '', redFlags: false });
              setHistoryReport(null);
              setSelectedSpecialists([]);
              setSpecialistTranscripts({});
            }}
          onRestartWithFeedback={(feedback: any) => {
            clearRunStorage('mdt', activeCase?.id);
            const newComplaint = `${intakeData.chiefComplaint}\n\n[USER FEEDBACK FOR RE-EVALUATION]: ${feedback}`;
            setIntakeData({ ...intakeData, chiefComplaint: newComplaint });
            setHistoryReport(null);
            setSpecialistTranscripts({});
            setDashboardTab('specialists');
            setPhase('dashboard');
          }}
        />
      )}
    </>
  );
}
