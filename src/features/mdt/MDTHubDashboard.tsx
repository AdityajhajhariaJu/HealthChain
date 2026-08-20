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
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MDTSpecialistPanel, MDTReportPanel } from './MDTComponents';
import { saveReviewSnapshot, updateCaseDifferentials } from '../../services/CaseEngine';
import { runDifferentialAnalysis } from '../../services/geminiService';

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
  setMobileActiveTab
}) {
  const navigate = useNavigate();

  return (
    <>
      

      {/* Dashboard Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.8)', padding: '6px', borderRadius: '99px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <button
            onClick={() => setDashboardTab('specialists')}
            style={{
              padding: '12px 24px',
              borderRadius: '99px',
              border: 'none',
              background: dashboardTab === 'specialists' ? '#10B981' : 'transparent',
              color: dashboardTab === 'specialists' ? '#FFF' : '#64748B',
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Users size={18} /> Board discussion
          </button>
          <button
            onClick={() => setDashboardTab('mdt')}
            style={{
              padding: '12px 24px',
              borderRadius: '99px',
              border: 'none',
              background: dashboardTab === 'mdt' ? '#0F172A' : 'transparent',
              color: dashboardTab === 'mdt' ? '#FFF' : '#64748B',
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Network size={18} /> Board Synthesis
          </button>
        </div>
      </div>

      {dashboardTab === 'specialists' ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#FFF',
              padding: '12px 20px',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              border: '1px solid rgba(0,0,0,0.05)',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: isSessionPaused ? '#F59E0B' : '#10B981',
                    boxShadow: isSessionPaused ? '0 0 10px #F59E0B' : '0 0 10px #10B981',
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 700, color: isSessionPaused ? '#92400E' : '#065F46' }}>
                  {isSessionPaused ? 'Paused' : 'Active'}
                </span>
              </div>
              <div style={{ width: '1px', height: '20px', background: '#E2E8F0' }} />
              <button
                onClick={() => navigate(activeCase ? `/app/cases/${activeCase.id}` : '/app/today')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'transparent', color: '#64748B', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'color 0.15s' }}
                onMouseOver={e => e.currentTarget.style.color = '#0F172A'}
                onMouseOut={e => e.currentTarget.style.color = '#64748B'}
              >
                <ChevronLeft size={15} /> Back to case
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => {
                  setPhase('intake');
                  setIntakeData({ chiefComplaint: '', history: '', redFlags: false });
                  setHistoryReport(null);
                  setSelectedSpecialists([]);
                  setSpecialistTranscripts({});
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: '#FFF', color: '#475569', border: '1px solid #E2E8F0', cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.15s' }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#0F172A'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; }}
              >
                <RotateCcw size={14} /> Restart
              </button>
              <button
                onClick={() => setIsSessionPaused(!isSessionPaused)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: isSessionPaused ? '#ECFDF5' : '#FFFBEB', color: isSessionPaused ? '#065F46' : '#92400E', border: `1px solid ${isSessionPaused ? '#A7F3D0' : '#FDE68A'}`, cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.15s' }}
              >
                {isSessionPaused ? <Play size={14} /> : <Pause size={14} />}
                {isSessionPaused ? 'Resume' : 'Pause'}
              </button>
              <div style={{ width: '1px', height: '20px', background: '#E2E8F0' }} />
              <button
                onClick={() => {
                  setIsSessionPaused(false);
                  setDashboardTab('mdt');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', background: '#0F172A', color: '#FFF', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px', transition: 'all 0.15s', boxShadow: '0 2px 6px rgba(15,23,42,0.15)' }}
                onMouseOver={e => e.currentTarget.style.background = '#1E293B'}
                onMouseOut={e => e.currentTarget.style.background = '#0F172A'}
              >
                <CheckCircle2 size={14} /> Finish & Save
              </button>
            </div>
          </motion.div>

          <div
            style={{
              display: isMobile ? 'flex' : 'grid',
              flexDirection: isMobile ? 'column' : 'unset',
              gridTemplateColumns: isMobile ? 'unset' : 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '16px',
              opacity: isSessionPaused ? 0.6 : 1,
              pointerEvents: isSessionPaused ? 'none' : 'auto',
              transition: 'all 0.3s'
            }}
          >
            {isMobile && (
              <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', paddingBottom: '12px', WebkitOverflowScrolling: 'touch' }}>
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
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            {selectedSpecialists.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: (!isMobile || mobileActiveTab === i) ? 'flex' : 'none',
                  flex: 1,
                  width: '100%',
                  height: isMobile ? 'calc(100vh - 240px)' : 'auto',
                }}
              >
                <MDTSpecialistPanel
                  specialist={s}
                  index={i}
                  isPaused={isSessionPaused}
                  allSpecialists={selectedSpecialists}
                  intakeData={intakeData}
                  initialMessages={specialistTranscripts[s.id] || []}
                  activeDifferentials={activeCase?.differentials || []}
                  onUpdate={(id, transcript) => {
                    setSpecialistTranscripts((prev) => ({ ...prev, [id]: transcript }));
                  }}
                  onComplete={(id, transcript) => {
                    setSpecialistTranscripts((prev) => {
                      const updated = { ...prev, [id]: transcript };
                      return updated;
                    });
                  }}
                />
              </div>
            ))}
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

            if (activeCase?.id) {
              try {
                const { getProfile } = await import('../../services/ProfileEngine');
                const results = await runDifferentialAnalysis(intakeData, reviewRecords, getProfile());
                if (results && Array.isArray(results)) {
                  updateCaseDifferentials(activeCase.id, results);
                }
              } catch (e) {
                console.error('Failed auto DDx:', e);
              }
            }
          }}
          onRestart={() => {
            setPhase('intake');
            setIntakeData({ chiefComplaint: '', history: '', redFlags: false });
            setHistoryReport(null);
            setSelectedSpecialists([]);
            setSpecialistTranscripts({});
          }}
          onRestartWithFeedback={(feedback: any) => {
            const newComplaint = `${intakeData.chiefComplaint}\n\n[USER FEEDBACK FOR RE-EVALUATION]: ${feedback}`;
            setIntakeData({ ...intakeData, chiefComplaint: newComplaint });
            setHistoryReport(null);
            setSpecialistTranscripts({});
            setPhase('assessment');
          }}
        />
      )}
    </>
  );
}
