import json

# 1. Update geminiService.ts responseSchema
with open('src/services/geminiService.ts', 'r', encoding='utf-8') as f:
    gemini_content = f.read()

old_req = 'required: ["executiveSummary", "topDiagnoses", "recommendedActionPlan"]'
new_req = 'required: ["executiveSummary", "keyFindings", "interpretation", "nextSteps", "abnormalitiesNoted", "medicalTerms", "topDiagnoses", "recommendedActionPlan"]'

gemini_content = gemini_content.replace(old_req, new_req)

with open('src/services/geminiService.ts', 'w', encoding='utf-8') as f:
    f.write(gemini_content)

# 2. Update MDTHubDashboard.tsx Case Route tracker size
with open('src/features/mdt/MDTHubDashboard.tsx', 'r', encoding='utf-8') as f:
    dashboard_content = f.read()

old_section = """      <section style={{ padding: '24px', background: '#FFF', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '20px', border: '1px solid rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: 20, margin: '0 0 8px', color: '#0F172A' }}>Your case route</h2>
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.55, margin: '0 0 20px' }}>
          Every step updates this same case file. You can add evidence at any point, then run
          board correlation again when the picture changes.
        </p>
        <div
          style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))', gap: 12 }}
        >"""

new_section = """      <section style={{ padding: '16px', background: '#FFF', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', marginBottom: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: 16, margin: 0, color: '#0F172A', fontWeight: 700 }}>Your case route</h2>
        </div>
        <div
          style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))', gap: 8 }}
        >"""

dashboard_content = dashboard_content.replace(old_section, new_section)

# Reduce the padding inside the step cards
old_step_card = """                style={{
                  position: 'relative',
                  padding: '16px 12px',
                  borderRadius: 12,
                  background: current ? '#ECFDF5' : complete ? '#F8FAFC' : '#FFF',
                  border: `1px solid ${current ? '#99F6E4' : '#E2E8F0'}`,
                }}"""

new_step_card = """                style={{
                  position: 'relative',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: current ? '#ECFDF5' : complete ? '#F8FAFC' : '#FFF',
                  border: `1px solid ${current ? '#99F6E4' : '#E2E8F0'}`,
                }}"""

dashboard_content = dashboard_content.replace(old_step_card, new_step_card)

with open('src/features/mdt/MDTHubDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(dashboard_content)
