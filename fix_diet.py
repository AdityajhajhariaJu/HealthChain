import sys

fpath = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

import re
pattern = re.compile(r"background:\s*'linear-gradient\([^)]+\)',\s*backdropFilter:\s*'blur\([^)]+\)',\s*WebkitBackdropFilter:\s*'blur\([^)]+\)',\s*borderRadius:\s*'32px',\s*padding:\s*'24px 16px',\s*boxShadow:\s*'[^']+',")

replacement = """background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              borderRadius: '32px',
              padding: '24px 16px',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)',"""

content = pattern.sub(replacement, content)

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated DieticianDashboardTracker")
