import sys
import re
import os

glass_css = """background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.3) 100%)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',"""

glass_css_single_line = "background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.3) 100%)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',"

# 1. Update ConsultPage.tsx with blobs
consult_path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\consultation\ConsultPage.tsx'
with open(consult_path, 'r', encoding='utf-8') as f:
    c_content = f.read()

c_content = c_content.replace(
    "padding: '24px 16px 60px 16px',\n      }}",
    "padding: '24px 16px 60px 16px',\n        position: 'relative',\n        overflow: 'hidden'\n      }}"
)

c_content = c_content.replace(
    ">",
    ">\n      {/* Aesthetic background blobs for Consult glass cards */}\n      <div style={{ position: 'absolute', top: '5%', left: '0%', width: '300px', height: '300px', background: '#FFEDD5', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0 }} />\n      <div style={{ position: 'absolute', top: '30%', right: '-5%', width: '250px', height: '250px', background: '#FEE2E2', borderRadius: '50%', filter: 'blur(70px)', zIndex: 0 }} />\n      <div style={{ position: 'absolute', top: '60%', left: '10%', width: '350px', height: '350px', background: '#FEF3C7', borderRadius: '50%', filter: 'blur(90px)', zIndex: 0 }} />\n      <div style={{ position: 'absolute', bottom: '0%', right: '0%', width: '250px', height: '250px', background: '#ECFCCB', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0 }} />",
    1
)

with open(consult_path, 'w', encoding='utf-8') as f:
    f.write(c_content)

# 2. Update QuickConsult.tsx
qc_path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\consultation\QuickConsult.tsx'
with open(qc_path, 'r', encoding='utf-8') as f:
    qc_content = f.read()

qc_content = re.sub(r"background: '#FFFFFF',", glass_css, qc_content)
with open(qc_path, 'w', encoding='utf-8') as f:
    f.write(qc_content)

# 3. Update MDTHub.tsx
mdt_path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\mdt\MDTHub.tsx'
with open(mdt_path, 'r', encoding='utf-8') as f:
    mdt_content = f.read()

mdt_content = re.sub(r"background: '#FFFFFF',", glass_css, mdt_content)
with open(mdt_path, 'w', encoding='utf-8') as f:
    f.write(mdt_content)

# 4. Update MDTComponents.tsx
mdtc_path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\mdt\MDTComponents.tsx'
with open(mdtc_path, 'r', encoding='utf-8') as f:
    mdtc_content = f.read()

mdtc_content = re.sub(r"background: '#FFFFFF',", glass_css, mdtc_content)
with open(mdtc_path, 'w', encoding='utf-8') as f:
    f.write(mdtc_content)

print("Updated everything to glassmorphism")
