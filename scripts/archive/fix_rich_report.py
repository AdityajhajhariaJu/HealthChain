with open('src/components/ui/RichReportTemplate.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update Interface
old_interface = """export interface RichReportData {
  executiveSummary?: string;
  keyFindings?: string;
  interpretation?: string;
  nextSteps?: string;
  abnormalitiesNoted?: string[];
  biomarkers?: Record<string, { value: number; min: number; max: number; unit: string }>;
  medicalTerms?: { term: string; definition: string }[];
}"""

new_interface = """export interface RichReportData {
  executiveSummary?: string;
  keyFindings?: string;
  interpretation?: string;
  nextSteps?: string;
  abnormalitiesNoted?: string[];
  biomarkers?: Record<string, { value: number; min: number; max: number; unit: string }>;
  medicalTerms?: { term: string; definition: string }[];
  specialistDebatePoints?: string[];
  systemicCorrelations?: string[];
}"""

content = content.replace(old_interface, new_interface)

# Add rendering for new fields
# I will insert it after "interpretation"
old_interpretation = """        {report.interpretation && (
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: isMobile ? '16px' : '24px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#059669" /> Interpretation
            </h3>
            <p style={{ fontSize: '14.5px', color: '#334155', lineHeight: 1.6, margin: 0 }}>
              {report.interpretation}
            </p>
          </div>
        )}"""

new_interpretation = old_interpretation + """

        {report.specialistDebatePoints && report.specialistDebatePoints.length > 0 && (
          <div style={{ background: '#F8FAFC', borderRadius: '16px', padding: isMobile ? '16px' : '24px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="#6366F1" /> Multidisciplinary Consensus
            </h3>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', fontSize: '14.5px', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: 1.6 }}>
              {report.specialistDebatePoints.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </div>
        )}

        {report.systemicCorrelations && report.systemicCorrelations.length > 0 && (
          <div style={{ background: '#F0F9FF', borderRadius: '16px', padding: isMobile ? '16px' : '24px', border: '1px solid #BAE6FD' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0369A1', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Network size={18} color="#0284C7" /> Systemic Correlations
            </h3>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#0369A1', fontSize: '14.5px', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: 1.6 }}>
              {report.systemicCorrelations.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </div>
        )}"""

content = content.replace(old_interpretation, new_interpretation)

# I need to add Users and Network to lucide-react imports
old_import = "import { Activity, AlertCircle, BookOpen, CheckCircle2, ListChecks } from 'lucide-react';"
new_import = "import { Activity, AlertCircle, BookOpen, CheckCircle2, ListChecks, Users, Network } from 'lucide-react';"
content = content.replace(old_import, new_import)

with open('src/components/ui/RichReportTemplate.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
