import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Copy, Check, Printer, Download, Stethoscope, ShieldCheck, Calendar, Activity } from 'lucide-react';
import { generateDoctorSummary, DoctorSummaryReport } from '../../services/TriggerEngine';
import { triggerHapticLight } from '../../services/haptics';

export const DoctorSummaryView: React.FC = () => {
  const [report, setReport] = useState<DoctorSummaryReport>(generateDoctorSummary());
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyNote = () => {
    triggerHapticLight();
    const formattedText = `CLINICAL METABOLIC & FOOD SENSITIVITY REPORT
Patient: ${report.patientName} (Age: ${report.age || 26})
Generated: ${report.generatedAt}
Platform: HealthChain 360 Precision Metabolic Intelligence

1. SBAR CLINICAL SUMMARY
- Situation: ${report.sbarSummary.situation}
- Background: ${report.sbarSummary.background}
- Assessment: ${report.sbarSummary.assessment}
- Recommendation: ${report.sbarSummary.recommendation}

2. BIOCHEMICAL SENSITIVITY CORRELATIONS
${report.biochemicalSensitivities.map((s) => `• ${s.name}: +${s.percentage}% flare correlation (Window: ${s.window})`).join('\n')}

3. TOP SUSPECT CULPRIT FOODS
${report.topCulpritFoods.map((f) => `• ${f.name} (${f.category}): +${f.correlationPercent}% flare rate, ${f.flaresTracked} observed flares | Safe swap: ${f.safeSwap}`).join('\n')}

4. ACTIVE CLINICAL INTERVENTIONS
${report.activeTrials}

5. CLINICAL RECOMMENDATIONS
${report.clinicalRecommendations.map((r) => `• ${r}`).join('\n')}
`;

    navigator.clipboard.writeText(formattedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrint = () => {
    triggerHapticLight();
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2F6 100%)',
          borderRadius: '20px',
          padding: '16px 18px',
          border: '1.5px solid #CBD5E1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              flexShrink: 0,
            }}
          >
            <Stethoscope size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0284C7', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              PHYSICIAN-READY CLINICAL SYNTHESIS
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917', lineHeight: 1.2 }}>
              Doctor-Ready Clinical PDF Export
            </div>
            <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>
              Structured medical briefing for your Gastroenterologist, Allergist, or Functional MD.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handleCopyNote}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: isCopied ? '#ECFDF5' : '#FFFFFF',
              color: isCopied ? '#059669' : '#1E293B',
              border: isCopied ? '1.5px solid #10B981' : '1.5px solid #CBD5E1',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
            }}
          >
            {isCopied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
            <span>{isCopied ? 'Copied SBAR' : 'Copy SBAR Note'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
            }}
          >
            <Printer size={14} />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Structured Clinical SBAR Document Card */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '22px',
          padding: '22px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Document Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5px solid #F1F5F9', paddingBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
              Patient Briefing File
            </div>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
              {report.patientName}
            </h3>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
              {report.generatedAt}
            </div>
            <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 700, marginTop: '2px' }}>
              ● Verified Electronic Clinical Note
            </div>
          </div>
        </div>

        {/* SBAR Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px 14px', border: '1px solid #E2E8F0' }}>
            <strong style={{ fontSize: '12px', color: '#0284C7', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              [S] Situation
            </strong>
            <span style={{ fontSize: '13px', color: '#334155', lineHeight: 1.4 }}>
              {report.sbarSummary.situation}
            </span>
          </div>

          <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px 14px', border: '1px solid #E2E8F0' }}>
            <strong style={{ fontSize: '12px', color: '#0284C7', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              [B] Background
            </strong>
            <span style={{ fontSize: '13px', color: '#334155', lineHeight: 1.4 }}>
              {report.sbarSummary.background}
            </span>
          </div>

          <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px 14px', border: '1px solid #E2E8F0' }}>
            <strong style={{ fontSize: '12px', color: '#0284C7', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              [A] Assessment
            </strong>
            <span style={{ fontSize: '13px', color: '#334155', lineHeight: 1.4 }}>
              {report.sbarSummary.assessment}
            </span>
          </div>

          <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px 14px', border: '1px solid #E2E8F0' }}>
            <strong style={{ fontSize: '12px', color: '#0284C7', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              [R] Recommendation
            </strong>
            <span style={{ fontSize: '13px', color: '#334155', lineHeight: 1.4 }}>
              {report.sbarSummary.recommendation}
            </span>
          </div>
        </div>

        {/* Suspect Culprits Table for MD */}
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#8E9AAF', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            CORRELATED BIOCHEMICAL CULPRITS
          </span>
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {report.topCulpritFoods.map((f) => (
              <div
                key={f.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: '#FFF8F5',
                  border: '1px solid #FFE4D6',
                  fontSize: '12.5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{f.emoji}</span>
                  <strong style={{ color: '#1E293B' }}>{f.name}</strong>
                  <span style={{ color: '#64748B' }}>({f.primarySensitivity})</span>
                </div>
                <span style={{ fontWeight: 800, color: '#E11D48' }}>
                  +{f.correlationPercent}% flare rate
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Interventions & Recommendations */}
        <div style={{ background: '#ECFDF5', borderRadius: '14px', padding: '14px', border: '1px solid #A7F3D0' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#047857', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '6px' }}>
            Active Interventions & Protocol Adherence:
          </div>
          <div style={{ fontSize: '13px', color: '#065F46', fontWeight: 600, marginBottom: '8px' }}>
            {report.activeTrials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {report.clinicalRecommendations.map((r, i) => (
              <div key={i} style={{ fontSize: '12px', color: '#047857', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span>•</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
