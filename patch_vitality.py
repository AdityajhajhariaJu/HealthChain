import sys

with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove Vitality section
import_to_remove = "import { VitalityRing } from '../../components/ui/VitalityRing';"
section_to_remove = '''      {/* Point 4: Sensual Data Visualization */}
      <section style={{ margin: '8px 0 24px' }}>
        <div style={{ padding: '0 24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0', color: '#0F172A', letterSpacing: '-0.5px' }}>Vitality Score</h2>
          <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: '14px' }}>Your 7-day health momentum.</p>
          <VitalityRing progress={82} />
          <SensualLineChart />
        </div>
      </section>'''

content = content.replace(import_to_remove, "")
content = content.replace(section_to_remove, "")

with open('src/features/dashboard/CaseDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/features/profile/MedicalProfile.tsx', 'r', encoding='utf-8') as f:
    profile_content = f.read()

if "import { VitalityRing }" not in profile_content:
    profile_content = profile_content.replace("import { motion } from 'framer-motion';", "import { motion } from 'framer-motion';\nimport { VitalityRing } from '../../components/ui/VitalityRing';\nimport { SensualLineChart } from '../../components/ui/SensualLineChart';")

vitality_section = '''
      {/* Vitality Score Section */}
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
      </motion.div>
'''

# insert after Premium Hero Header
# search for </motion.div> that closes the Premium Hero Header
import re

hero_close_regex = r"(<div style={{ flex: 1 }}>.*?</h1>.*?</div>.*?</div>.*?)(</motion.div>)"

# Instead of regex, let's just find the exact place to insert.
# The hero header is followed by:
#       {/* NEW: Smart Auto-Refill Adherence Engine */}

insert_point = "{/* NEW: Smart Auto-Refill Adherence Engine */}"
if insert_point in profile_content:
    profile_content = profile_content.replace(insert_point, vitality_section + "\n      " + insert_point)

with open('src/features/profile/MedicalProfile.tsx', 'w', encoding='utf-8') as f:
    f.write(profile_content)

print('Done')
