import sys

fpath = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

import re
pattern = re.compile(r'\{\/\* Aesthetic background blobs so the glassmorphism has something to blur! \*\/\}.*?<div[^>]+>.*?<div[^>]+>.*?<div[^>]+>', re.DOTALL)

replacement = """{/* Small, distinct patches of color perfectly matched to the thumbnails directly above them */}
          {/* Top Left: Full Meditation (Teal) */}
          <div style={{ position: 'absolute', top: '10%', left: '20%', width: '100px', height: '100px', background: '#99F6E4', borderRadius: '50%', filter: 'blur(35px)', zIndex: 0 }} />
          {/* Top Right: Deep Sleep (Warm Amber) */}
          <div style={{ position: 'absolute', top: '10%', right: '20%', width: '100px', height: '100px', background: '#FDE68A', borderRadius: '50%', filter: 'blur(35px)', zIndex: 0 }} />
          
          {/* Middle Left: Deep Focus (Stone/Grey) */}
          <div style={{ position: 'absolute', top: '40%', left: '20%', width: '100px', height: '100px', background: '#FFEDD5', borderRadius: '50%', filter: 'blur(35px)', zIndex: 0 }} />
          {/* Middle Right: Morning Energy (Slate/Sky) */}
          <div style={{ position: 'absolute', top: '40%', right: '20%', width: '100px', height: '100px', background: '#BAE6FD', borderRadius: '50%', filter: 'blur(35px)', zIndex: 0 }} />
          
          {/* Bottom Left: Rain Sounds (Purple) */}
          <div style={{ position: 'absolute', bottom: '10%', left: '15%', width: '90px', height: '90px', background: '#E9D5FF', borderRadius: '50%', filter: 'blur(30px)', zIndex: 0 }} />
          {/* Bottom Middle: Focus Frequencies (Teal) */}
          <div style={{ position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)', width: '90px', height: '90px', background: '#A7F3D0', borderRadius: '50%', filter: 'blur(30px)', zIndex: 0 }} />
          {/* Bottom Right: Ambient (Slate) */}
          <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '90px', height: '90px', background: '#E2E8F0', borderRadius: '50%', filter: 'blur(30px)', zIndex: 0 }} />"""

content = pattern.sub(replacement, content)

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Restored contextual colors to CaseDashboard but as small distinct patches")
