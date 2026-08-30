import sys

# 1. Update CaseDashboard
with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    dashboard_content = f.read()

dashboard_content = dashboard_content.replace("import { PredictiveTimeline } from '../../components/ui/PredictiveTimeline';", "")
dashboard_content = dashboard_content.replace("<PredictiveTimeline />", "")

with open('src/features/dashboard/CaseDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(dashboard_content)

# 2. Update MedicalProfile
with open('src/features/profile/MedicalProfile.tsx', 'r', encoding='utf-8') as f:
    profile_content = f.read()

if "import { PredictiveTimeline }" not in profile_content:
    profile_content = profile_content.replace("import { SensualLineChart } from '../../components/ui/SensualLineChart';", "import { SensualLineChart } from '../../components/ui/SensualLineChart';\nimport { PredictiveTimeline } from '../../components/ui/PredictiveTimeline';")

# Find the Vitality Score Section and replace it with both components + explanations
vitality_original = '''      {/* Vitality Score Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{ padding: '24px', marginBottom: '32px' }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0', color: '#0F172A', letterSpacing: '-0.5px' }}>Vitality Score</h2>
        <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: '13px' }}>Your 7-day health momentum.</p>
        <VitalityRing progress={82} />
        <SensualLineChart />
      </motion.div>'''

vitality_new = '''      {/* Advanced Clinical Engines Section */}
      <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Vitality Score */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
          style={{ padding: '24px' }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0', color: '#0F172A', letterSpacing: '-0.5px' }}>Vitality Score</h2>
          <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: '13px' }}>Your 7-day health momentum.</p>
          <VitalityRing progress={82} />
          <SensualLineChart />
          
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)', fontSize: '12px', color: '#64748B', lineHeight: '1.6' }}>
            <strong style={{ color: '#0F172A' }}>How it's calculated:</strong> The Vitality Score aggregates your rolling 7-day momentum across three pillars:<br/>
            • <strong>Clinical Adherence (40%):</strong> Staying within your AI Dietician's medical guardrails (e.g., sodium/calorie targets).<br/>
            • <strong>Biometric Recovery (40%):</strong> Apple Health / Google Fit passive data (Resting HR, HRV, Sleep Duration).<br/>
            • <strong>App Engagement (20%):</strong> Consistency in logging meals, check-ins, and symptom tracking.
          </div>
        </motion.div>

        {/* Predictive Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
          style={{ padding: '24px 0' }}
        >
          <PredictiveTimeline />
          <div style={{ padding: '0 24px', marginTop: '8px' }}>
            <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)', fontSize: '12px', color: '#64748B', lineHeight: '1.6' }}>
              <strong style={{ color: '#0F172A' }}>How it works:</strong> The Predictive Timeline is a proactive biological forecast.<br/>
              • It pulls your passive biometric stream (Heart Rate, Glucose, Activity) from wearables.<br/>
              • It runs the data through the clinical engine to predict upcoming biological states (like a glucose crash or peak metabolic rate).<br/>
              • It allows you to anticipate your body's needs before you actually feel symptoms like fatigue or cravings.
            </div>
          </div>
        </motion.div>

      </div>'''

profile_content = profile_content.replace(vitality_original, vitality_new)

with open('src/features/profile/MedicalProfile.tsx', 'w', encoding='utf-8') as f:
    f.write(profile_content)

print('Done')
