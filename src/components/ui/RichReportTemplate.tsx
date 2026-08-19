import React from 'react';
import { Activity, AlertCircle, BookOpen, CheckCircle2, ListChecks } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export interface RichReportData {
  executiveSummary?: string;
  keyFindings?: string;
  interpretation?: string;
  nextSteps?: string;
  abnormalitiesNoted?: string[];
  biomarkers?: Record<string, { value: number; min: number; max: number; unit: string }>;
  medicalTerms?: { term: string; definition: string }[];
}

export function RichReportTemplate({ report, isMobile }: { report: RichReportData; isMobile?: boolean }) {
  if (!report) return null;

  const hasRichData = report.keyFindings || report.interpretation || (report.abnormalitiesNoted && report.abnormalitiesNoted.length > 0) || report.nextSteps;

  if (!hasRichData) {
    return (
      <p style={{ margin: 0, lineHeight: 1.7, color: '#334155' }}>
        {report.executiveSummary || 'No case synthesis available yet.'}
      </p>
    );
  }

  return (
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

        {report.nextSteps && (
          <div style={{ background: '#F0FDF4', borderRadius: '16px', padding: isMobile ? '16px' : '24px', border: '1px solid #BBF7D0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#166534', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ListChecks size={18} color="#15803D" /> Next Steps & Recommendations
            </h3>
            <p style={{ fontSize: '14.5px', color: '#166534', lineHeight: 1.6, margin: 0 }}>
              {report.nextSteps}
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {report.abnormalitiesNoted && report.abnormalitiesNoted.length > 0 && (
          <div style={{ background: '#FEF2F2', borderRadius: '16px', padding: isMobile ? '16px' : '24px', border: '1px solid #FECACA' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#991B1B', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} color="#DC2626" /> Abnormalities Noted
            </h3>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#991B1B', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {report.abnormalitiesNoted.map((abn, i) => (
                <li key={i}>{abn}</li>
              ))}
            </ul>
          </div>
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
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: isMobile ? '16px' : '24px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} color="#3B82F6" /> Medical Terms Used
            </h3>
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
          </div>
        )}
      </div>
    </div>
  );
}
