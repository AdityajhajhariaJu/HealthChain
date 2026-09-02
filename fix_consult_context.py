import sys

fpath = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\consultation\ConsultPage.tsx'
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

import re
pattern = re.compile(r'\{\/\* Aesthetic background blobs so the glassmorphism has something to blur! \*\/\}.*?<div[^>]+>.*?<div[^>]+>.*?<div[^>]+>', re.DOTALL)

replacement = """{/* Small, distinct patches of color perfectly matched to the Consult Page context (Soft Blue & Slate) */}
        {/* Top Left: Near 'Attach Lab Reports' and 'Quick Consult' (Soft Blue) */}
        <div style={{ position: 'absolute', top: '15%', left: '15%', width: '120px', height: '120px', background: '#DBEAFE', borderRadius: '50%', filter: 'blur(35px)', zIndex: 0 }} />
        {/* Middle Right: Near 'Deploy AI Agents' (Soft Slate/Blue) */}
        <div style={{ position: 'absolute', top: '45%', right: '15%', width: '120px', height: '120px', background: '#E2E8F0', borderRadius: '50%', filter: 'blur(35px)', zIndex: 0 }} />
        {/* Bottom Left: Near 'Collaborative Cases' (Soft Creme/White) */}
        <div style={{ position: 'absolute', bottom: '15%', left: '20%', width: '120px', height: '120px', background: '#F8FAFC', borderRadius: '50%', filter: 'blur(35px)', zIndex: 0 }} />"""

content = pattern.sub(replacement, content)

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Restored contextual colors to ConsultPage (Blue/Slate) and removed green")
