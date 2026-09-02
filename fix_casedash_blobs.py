import sys

fpath = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

import re
pattern = re.compile(r'\{\/\* Calming aesthetic background blobs radiating colors from the thumbnails \*\/\}.*?\{\/\* Right Soundscape: Ambient \(Slate Twilight\) \*\/\}\s*<div[^>]+>\s*', re.DOTALL)

replacement = """{/* Aesthetic background blobs so the glassmorphism has something to blur! */}
          <div style={{ position: 'absolute', top: '10%', left: '10%', width: '120px', height: '120px', background: '#A7F3D0', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0 }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '150px', height: '150px', background: '#DBEAFE', borderRadius: '50%', filter: 'blur(50px)', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: '40%', right: '30%', width: '100px', height: '100px', background: '#FDE68A', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0 }} />

"""

content = pattern.sub(replacement, content)

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Reverted CaseDashboard blobs to exactly the 3 small diet patches")
