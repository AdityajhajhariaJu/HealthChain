import React, { useState } from 'react';
import { Activity, AlertCircle, BookOpen, CheckCircle2, ListChecks, Users, Network, ChevronDown, HelpCircle } from 'lucide-react';

const Accordion = ({ title, icon: Icon, iconColor, bgColor, borderColor, textColor, children, defaultOpen = false, isMobile = false }: any) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div style={{ background: bgColor, borderRadius: '16px', border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          width: '100%', padding: isMobile ? '16px' : '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, color: textColor }}>
          {Icon && <Icon size={18} color={iconColor} />}
          {title}
        </div>
        <ChevronDown size={18} color={textColor} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </button>
      {isOpen && (
        <div style={{ padding: isMobile ? '0 16px 16px 16px' : '0 24px 24px 24px' }}>
          {children}
        </div>
      )}
    </div>
  );
};
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export interface RichReportData {
  executiveSummary?: string;
  keyFindings?: string;
  questionsForClinician?: string[];
  interpretation?: string;
  nextSteps?: string;
  abnormalitiesNoted?: string[];
  biomarkers?: Record<string, { value: number; min: number; max: number; unit: string }>;
  medicalTerms?: { term: string; definition: string }[];
  specialistDebatePoints?: string[];
  systemicCorrelations?: string[];
  scientificLiteratureContext?: string;
  alternativeOrRarePossibilities?: string;
}

export function RichReportTemplate({ report, isMobile }: { report: RichReportData; isMobile?: boolean }) {
  if (!report) return null;

  const hasRichData = report.keyFindings || report.interpretation || (report.abnormalitiesNoted && report.abnormalitiesNoted.length > 0) || report.nextSteps;

  if (!hasRichData) {
    return (
      <p style={{ margin: 0, lineHeight: 1.7, color: '#334155' }}>
        {report.executiveSummary || 'Based on the review of your symptoms and recent discussion, the board has identified discussion pathways, but a structured summary could not be rendered at this time.'}
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {report.executiveSummary && hasRichData && (
        <div style={{ background: '#F8FAFC', padding: isMobile ? '16px' : '24px', borderRadius: '16px', border: '1px solid #E2E8F0', color: '#334155', fontSize: '15.5px', lineHeight: 1.7 }}>
          <strong style={{ color: '#0F172A', display: 'block', marginBottom: '8px' }}>Executive Summary</strong>
          {report.executiveSummary}
        </div>
      )}
      <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : 'unset', gridTemplateColumns: isMobile ? 'unset' : '1.2fr 0.8fr', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {report.keyFindings && (
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: isMobile ? '16px' : '24px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="#4F46E5" /> Key Findings
            </h3>
            <p style={{ fontSize: '14.5px', color: '#334155', lineHeight: 1.6, margin: 0 }}>
              {report.keyFindings}
            </p>
          </div>
        )}

        {report.interpretation && (
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: isMobile ? '16px' : '24px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#059669" /> Interpretation
            </h3>
            <p style={{ fontSize: '14.5px', color: '#334155', lineHeight: 1.6, margin: 0 }}>
              {report.interpretation}
            </p>
          </div>
        )}

        {report.specialistDebatePoints && report.specialistDebatePoints.length > 0 && (
          <Accordion title="Multidisciplinary Consensus" icon={Users} iconColor="#6366F1" bgColor="#F8FAFC" borderColor="#E2E8F0" textColor="#0F172A" isMobile={isMobile}>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', fontSize: '14.5px', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: 1.6 }}>
              {report.specialistDebatePoints.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </Accordion>
        )}

        {report.systemicCorrelations && report.systemicCorrelations.length > 0 && (
          <Accordion title="Systemic Correlations" icon={Network} iconColor="#0284C7" bgColor="#F0F9FF" borderColor="#BAE6FD" textColor="#0369A1" isMobile={isMobile}>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#0369A1', fontSize: '14.5px', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: 1.6 }}>
              {report.systemicCorrelations.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </Accordion>
        )}

        
        {report.scientificLiteratureContext && (
          <Accordion title="Scientific Literature Context" icon={BookOpen} iconColor="#7C3AED" bgColor="#F5F3FF" borderColor="#DDD6FE" textColor="#5B21B6" isMobile={isMobile}>
            <p style={{ margin: 0, color: '#5B21B6', fontSize: '14.5px', lineHeight: 1.6 }}>
              {report.scientificLiteratureContext}
            </p>
          </Accordion>
        )}

        {report.alternativeOrRarePossibilities && (
          <Accordion title="Alternative & Rare Possibilities" icon={AlertCircle} iconColor="#D97706" bgColor="#FFFBEB" borderColor="#FDE68A" textColor="#92400E" isMobile={isMobile}>
            <p style={{ margin: 0, color: '#92400E', fontSize: '14.5px', lineHeight: 1.6 }}>
              {report.alternativeOrRarePossibilities}
            </p>
          </Accordion>
        )}

        {report.nextSteps && (
          <Accordion title="Next Steps & Recommendations" icon={ListChecks} iconColor="#15803D" bgColor="#F0FDF4" borderColor="#BBF7D0" textColor="#166534" isMobile={isMobile} defaultOpen={true}>
            <p style={{ fontSize: '14.5px', color: '#166534', lineHeight: 1.6, margin: 0 }}>
              {report.nextSteps}
            </p>
          </Accordion>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {report.questionsForClinician && report.questionsForClinician.length > 0 && (
          <Accordion title="Questions for Your Clinician" icon={HelpCircle} iconColor="#0F172A" bgColor="#F1F5F9" borderColor="#E2E8F0" textColor="#0F172A" isMobile={isMobile} defaultOpen={true}>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', fontSize: '14.5px', display: 'flex', flexDirection: 'column', gap: '12px', lineHeight: 1.5 }}>
              {report.questionsForClinician.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </Accordion>
        )}

        {report.abnormalitiesNoted && report.abnormalitiesNoted.length > 0 && (
          <Accordion title="Abnormalities Noted" icon={AlertCircle} iconColor="#DC2626" bgColor="#FEF2F2" borderColor="#FECACA" textColor="#991B1B" isMobile={isMobile} defaultOpen={true}>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#991B1B', fontSize: '14.5px', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: 1.6 }}>
              {report.abnormalitiesNoted.map((abn, i) => (
                <li key={i}>{abn}</li>
              ))}
            </ul>
          </Accordion>
        )}

        {report.biomarkers && Object.keys(report.biomarkers).length > 0 && (
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: isMobile ? '16px' : '24px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#0EA5E9" /> Biomarker Tracking
            </h3>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(report.biomarkers).map(([key, data]) => ({
                    name: key,
                    value: data.value,
                    min: data.min,
                    max: data.max,
                    unit: data.unit,
                    isLow: data.value < data.min,
                    isHigh: data.value > data.max
                  }))}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div style={{ background: '#FFF', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                            <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>{data.name}</div>
                            <div style={{ fontSize: 13, color: data.isLow || data.isHigh ? '#DC2626' : '#059669' }}>
                              Value: {data.value} {data.unit}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748B' }}>
                              Normal: {data.min} - {data.max} {data.unit}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {Object.entries(report.biomarkers).map((_, index) => {
                      const data = Object.values(report.biomarkers!)[index];
                      return <Cell key={`cell-${index}`} fill={(data.value < data.min || data.value > data.max) ? '#F87171' : '#34D399'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {report.medicalTerms && report.medicalTerms.length > 0 && (
          <Accordion title="Medical Terms Dictionary" icon={BookOpen} iconColor="#3B82F6" bgColor="#FFFFFF" borderColor="#E2E8F0" textColor="#0F172A" isMobile={isMobile}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {report.medicalTerms.map((term, i) => (
                <div key={i}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '2px' }}>
                    {term.term}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                    {term.definition}
                  </div>
                </div>
              ))}
            </div>
          </Accordion>
        )}
      </div>
      </div>
    </div>
  );
}