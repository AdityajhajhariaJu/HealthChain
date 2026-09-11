import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  BrainCircuit,
  Activity,
  Briefcase,
  CheckCircle2,
  X,
} from 'lucide-react';
import { triggerHapticLight, triggerHapticSelection } from '../../services/haptics';
import { CaseItem } from '../../services/CaseEngine';

interface InfiniteHealthCanvasProps {
  cases: CaseItem[];
}

export const InfiniteHealthCanvas: React.FC<InfiniteHealthCanvasProps> = ({ cases }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Sort cases oldest to newest for chronological timeline
  const timelineCases = [...cases].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const activeSelectedCase = timelineCases.find(c => c.id === selectedCaseId) || null;

  if (timelineCases.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', background: '#F8FAFC', borderRadius: '24px', border: '1px dashed #CBD5E1' }}>
        <Activity size={32} color="#94A3B8" style={{ margin: '0 auto 10px' }} />
        <p style={{ margin: 0, fontWeight: 600 }}>No cases to map on your journey yet.</p>
        <span style={{ fontSize: '13px', color: '#94A3B8' }}>Start an investigation or import clinical records to view your health journey.</span>
      </div>
    );
  }

  // Calculate layout widths
  const itemWidth = 260;
  const gap = 110;
  const totalWidth = Math.max(window.innerWidth, timelineCases.length * (itemWidth + gap) + 400);

  // SVG Line Path connecting case nodes
  const generatePath = () => {
    let d = 'M 0 160 ';
    timelineCases.forEach((_, i) => {
      const x = 200 + i * (itemWidth + gap);
      const y = i % 2 === 0 ? 130 : 190;
      d += `S ${x - 100} ${y}, ${x} ${y} `;
    });
    d += `L ${totalWidth} 160`;
    return d;
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: '430px',
        background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
        borderRadius: '24px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'inset 0 4px 24px rgba(0,0,0,0.02)',
        border: '1.5px solid #E2E8F0',
      }}
    >
      <motion.div
        drag="x"
        dragConstraints={containerRef}
        dragElastic={0.1}
        onDrag={() => triggerHapticLight()}
        style={{
          width: totalWidth,
          height: '100%',
          position: 'absolute',
          left: 0,
          top: 0,
          display: 'flex',
          alignItems: 'center',
          cursor: 'grab',
          userSelect: 'none',
        }}
        whileTap={{ cursor: 'grabbing' }}
      >
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <defs>
            <linearGradient id="timelineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0D9488" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0F766E" stopOpacity="0.85" />
            </linearGradient>
          </defs>
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            d={generatePath()}
            fill="none"
            stroke="url(#timelineGrad)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>

        {timelineCases.map((c, i) => {
          const isJarvis = c.mode === 'jarvis' || c.title?.toLowerCase().includes('jarvis') || c.currentStage === 'jarvis_complete';
          const yOffset = i % 2 === 0 ? -90 : 90;
          const isSelected = c.id === selectedCaseId;

          // Shared case clinical metrics
          const recordsCount = (c.medicalRecords || []).length;
          const reviewsCount = (c.reviews || []).length;
          const questions = c.questions || [];
          const openQuestions = questions.filter(q => q.status === 'open' || !q.status).length;
          const outcomeCount = questions.filter(q => q.status === 'discussed' || q.status === 'deferred' || q.status === 'resolved' || q.status === 'addressed').length;
          const brief = c.appointmentBriefs?.current;

          return (
            <motion.div
              key={c.id}
              role="button"
              tabIndex={0}
              aria-label={`View clinical case: ${c.title || 'Untitled Case'}`}
              initial={{ opacity: 0, y: yOffset + 20 }}
              animate={{ opacity: 1, y: yOffset }}
              transition={{ delay: 0.15 + (i * 0.08) }}
              onClick={() => {
                triggerHapticSelection();
                setSelectedCaseId(c.id === selectedCaseId ? null : c.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  triggerHapticSelection();
                  setSelectedCaseId(c.id === selectedCaseId ? null : c.id);
                }
              }}
              style={{
                position: 'absolute',
                left: 200 + i * (itemWidth + gap) - (itemWidth / 2),
                width: itemWidth,
                background: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '18px',
                padding: '16px',
                boxShadow: isSelected
                  ? '0 12px 36px rgba(13, 148, 136, 0.22), 0 0 0 2.5px #0D9488'
                  : '0 8px 30px rgba(15, 23, 42, 0.07)',
                border: isSelected
                  ? '2px solid #0D9488'
                  : `1.5px solid ${isJarvis ? '#FED7AA' : '#CCFBF1'}`,
                cursor: 'pointer',
                transition: 'border 0.2s ease, box-shadow 0.2s ease',
              }}
              whileHover={{ scale: 1.03, y: yOffset - 4 }}
            >
              {/* Header Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isJarvis ? <BrainCircuit size={15} color="#EA580C" /> : <Activity size={15} color="#0D9488" />}
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                      color: isJarvis ? '#C2410C' : '#0F766E',
                    }}
                  >
                    {isJarvis ? 'Clinical Engine' : 'Active Case'}
                  </span>
                </div>
                {brief && (
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '999px',
                      background: '#ECFDF5',
                      color: '#047857',
                      border: '0.8px solid #A7F3D0',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <CheckCircle2 size={10} /> Brief v{brief.version || 1}
                  </span>
                )}
              </div>

              {/* Case Title */}
              <h4
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#0F172A',
                  lineHeight: 1.35,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {c.intakeData?.chiefComplaint || c.title || 'Health Evaluation'}
              </h4>

              {/* Clinical Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', margin: '10px 0', fontSize: '11px', textAlign: 'center' }}>
                <div style={{ background: '#F8FAFC', padding: '5px 4px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <span style={{ display: 'block', fontWeight: 800, color: '#0F172A' }}>{recordsCount}</span>
                  <span style={{ fontSize: '9.5px', color: '#64748B' }}>Records</span>
                </div>
                <div style={{ background: '#F8FAFC', padding: '5px 4px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <span style={{ display: 'block', fontWeight: 800, color: '#0F172A' }}>{reviewsCount}</span>
                  <span style={{ fontSize: '9.5px', color: '#64748B' }}>Reviews</span>
                </div>
                <div style={{ background: openQuestions > 0 ? '#FEF3C7' : '#F8FAFC', padding: '5px 4px', borderRadius: '8px', border: openQuestions > 0 ? '1px solid #FDE68A' : '1px solid #E2E8F0' }}>
                  <span style={{ display: 'block', fontWeight: 800, color: openQuestions > 0 ? '#B45309' : '#0F172A' }}>
                    {openQuestions}
                  </span>
                  <span style={{ fontSize: '9.5px', color: openQuestions > 0 ? '#92400E' : '#64748B' }}>Open Qs</span>
                </div>
              </div>

              {/* Outcomes and Status Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', marginTop: '8px' }}>
                <span>{new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(c.createdAt))}</span>
                {outcomeCount > 0 ? (
                  <span style={{ color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <CheckCircle2 size={12} /> {outcomeCount} Outcomes
                  </span>
                ) : (
                  <span style={{ color: '#64748B' }}>{c.status || 'active'}</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Constraints container for Framer Motion */}
      <div ref={containerRef} style={{ position: 'absolute', top: 0, left: -(totalWidth - window.innerWidth + 400), right: 400, bottom: 0, pointerEvents: 'none' }} />

      {/* Interactive Case Inspector Panel for Selected Node */}
      <AnimatePresence>
        {activeSelectedCase && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              right: '16px',
              maxWidth: '680px',
              margin: '0 auto',
              background: '#FFFFFF',
              borderRadius: '18px',
              border: '1.5px solid #0D9488',
              boxShadow: '0 16px 40px rgba(15, 23, 42, 0.15)',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              zIndex: 30,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0D9488', textTransform: 'uppercase', background: '#F0FDFA', padding: '2px 8px', borderRadius: '999px', border: '1px solid #CCFBF1' }}>
                  Selected Journey Case
                </span>
                <strong style={{ fontSize: '14.5px', color: '#0F172A' }}>{activeSelectedCase.title || 'Case'}</strong>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCaseId(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                aria-label="Close case drawer"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12.5px', color: '#475569', flexWrap: 'wrap' }}>
              <span>Records: <strong>{(activeSelectedCase.medicalRecords || []).length}</strong></span>
              <span>Open Questions: <strong>{(activeSelectedCase.questions || []).filter(q => q.status === 'open' || !q.status).length}</strong></span>
              <span>Discussed / Resolved: <strong>{(activeSelectedCase.questions || []).filter(q => q.status === 'discussed' || q.status === 'deferred' || q.status === 'resolved' || q.status === 'addressed').length}</strong></span>
              {activeSelectedCase.appointmentBriefs?.current && (
                <span style={{ color: '#047857', fontWeight: 700 }}>
                  Brief: v{activeSelectedCase.appointmentBriefs.current.version || 1}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  navigate(`/app/case-prep?caseId=${encodeURIComponent(activeSelectedCase.id)}`);
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: '#0D9488',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Briefcase size={15} /> Prepare Appointment Brief →
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  navigate(`/app/cases/${activeSelectedCase.id}`);
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: '#F1F5F9',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Open Timeline
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};