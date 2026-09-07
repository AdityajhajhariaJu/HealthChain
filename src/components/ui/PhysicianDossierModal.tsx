import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Copy, Check, Printer, X, Stethoscope, ShieldCheck, Activity, Calendar, AlertCircle } from 'lucide-react';
import { generateDoctorSummary, DoctorSummaryReport } from '../../services/TriggerEngine';
import { getProfile } from '../../services/ProfileEngine';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';

interface PhysicianDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhysicianDossierModal: React.FC<PhysicianDossierModalProps> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<DoctorSummaryReport>(() => generateDoctorSummary());
  const [isCopied, setIsCopied] = useState(false);
  const profile = getProfile() || {};

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setReport(generateDoctorSummary());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyNote = () => {
    triggerHapticLight();
    const formattedText = `CLINICAL SBAR PHYSICIAN BRIEF
Patient: ${report.patientName} | Age: ${report.age || profile?.demographics?.age || 'Adult'} | Blood Group: ${profile?.demographics?.bloodGroup || 'Recorded'}
Date: ${report.generatedAt}
Platform: HealthChain 360 Clinical Intelligence

1. SBAR CLINICAL SUMMARY
- Situation: ${report.sbarSummary.situation}
- Background: ${report.sbarSummary.background}
- Assessment: ${report.sbarSummary.assessment}
- Recommendation: ${report.sbarSummary.recommendation}

2. CORRELATED TRIGGER SUSPECTS
${report.biochemicalSensitivities.map((s) => `• ${s.name}: +${s.percentage}% flare correlation (${s.window})`).join('\n') || 'None currently active'}

3. OBSERVED FOOD CORRELATIONS
${report.topCulpritFoods.map((f) => `• ${f.name} (${f.category}): +${f.correlationPercent}% flare rate, ${f.flaresTracked} episodes | Safe swap: ${f.safeSwap}`).join('\n') || 'No dietary culprits logged'}

4. HIGH-YIELD QUESTIONS FOR CLINICIAN
${report.clinicalRecommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
`;

    navigator.clipboard.writeText(formattedText);
    setIsCopied(true);
    triggerHapticSuccess();
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrint = () => {
    triggerHapticLight();
    window.print();
  };

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dossier-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          style={{
            width: '100%',
            maxWidth: '720px',
            maxHeight: 'calc(100vh - 40px)',
            background: '#FFFFFF',
            borderRadius: '28px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Top Bar */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                  flexShrink: 0,
                }}
              >
                <Stethoscope size={22} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#0D9488', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  PHYSICIAN-READY CLINICAL SYNTHESIS
                </div>
                <h2 id="dossier-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>
                  10-Minute Doctor Visit Brief
                </h2>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handlePrint}
                title="Print or save as PDF"
                aria-label="Print dossier"
                style={{
                  height: '44px',
                  padding: '0 14px',
                  borderRadius: '12px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Printer size={16} /> Print / PDF
              </button>

              <button
                type="button"
                onClick={handleCopyNote}
                aria-label="Copy SBAR clinical note"
                style={{
                  height: '44px',
                  padding: '0 14px',
                  borderRadius: '12px',
                  background: isCopied ? '#DCFCE7' : '#0F172A',
                  border: isCopied ? '1px solid #86EFAC' : 'none',
                  color: isCopied ? '#15803D' : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
                {isCopied ? 'Copied' : 'Copy SBAR'}
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close Doctor Visit Brief"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Printable / Scrollable Content Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Patient & Metadata Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                padding: '16px',
                background: '#F8FAFC',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Patient</span>
                <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{report.patientName}</p>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Age & Gender</span>
                <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                  {profile?.demographics?.age || 26} yrs • {profile?.demographics?.gender || 'Not specified'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Blood Group</span>
                <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                  {profile?.demographics?.bloodGroup || 'Standard'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Generated</span>
                <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{report.generatedAt}</p>
              </div>
            </div>

            {/* SBAR Section */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '18px', overflow: 'hidden' }}>
              <div style={{ background: '#F1F5F9', padding: '12px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} color="#0F766E" />
                <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                  SBAR Clinical Synthesis (Standard Medical Brief)
                </h3>
              </div>
              <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0D9488', textTransform: 'uppercase' }}>Situation (Chief Complaint)</span>
                  <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#1E293B', lineHeight: 1.45, fontWeight: 500 }}>
                    {report.sbarSummary.situation}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase' }}>Background</span>
                  <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#1E293B', lineHeight: 1.45, fontWeight: 500 }}>
                    {report.sbarSummary.background}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase' }}>Assessment</span>
                  <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#1E293B', lineHeight: 1.45, fontWeight: 500 }}>
                    {report.sbarSummary.assessment}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#15803D', textTransform: 'uppercase' }}>Recommendation</span>
                  <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#1E293B', lineHeight: 1.45, fontWeight: 500 }}>
                    {report.sbarSummary.recommendation}
                  </p>
                </div>
              </div>
            </div>

            {/* Suspect Trigger Vectors */}
            {report.biochemicalSensitivities.length > 0 && (
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '18px', padding: '18px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  Biochemical Sensitivity Correlates
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {report.biochemicalSensitivities.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#FEF3C7',
                        border: '1px solid #FCD34D',
                        borderRadius: '12px',
                        padding: '8px 14px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#92400E',
                      }}
                    >
                      {item.name}: +{item.percentage}% flare correlation ({item.window})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* High-Yield Questions for MD */}
            <div style={{ background: '#F0FDFA', border: '1.5px solid #99F6E4', borderRadius: '18px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ShieldCheck size={18} color="#0D9488" />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#115E59' }}>
                  3 High-Yield Questions for Your Clinician
                </h4>
              </div>
              <p style={{ fontSize: '12.5px', color: '#134E4A', margin: '0 0 12px' }}>
                Engineered to maximize your 10-minute appointment and focus on actionable diagnostics:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {report.clinicalRecommendations.map((q, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ fontWeight: 800, color: '#0D9488', fontSize: '13px' }}>{idx + 1}.</span>
                    <span style={{ fontSize: '13.5px', color: '#0F172A', fontWeight: 600, lineHeight: 1.4 }}>{q}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
