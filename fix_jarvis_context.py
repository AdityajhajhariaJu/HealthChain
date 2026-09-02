import sys
import re

fpath = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\jarvis\JarvisInvestigator.tsx'
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'\{\/\* Aesthetic background blobs so the glassmorphism has something to blur! \*\/\}.*?<div[^>]+>.*?<div[^>]+>.*?<div[^>]+>', re.DOTALL)

replacement = """{/* Small, distinct patches of color perfectly matched to the JARVIS action buttons directly above them */}
        {/* Top Left: Near 'Discuss with Ava' (Blue) */}
        <div style={{ position: 'absolute', top: '15%', left: '15%', width: '120px', height: '120px', background: '#BAE6FD', borderRadius: '50%', filter: 'blur(35px)', zIndex: 0 }} />
        {/* Middle Right: Near 'Analyze Labs' (Purple) */}
        <div style={{ position: 'absolute', top: '40%', right: '15%', width: '120px', height: '120px', background: '#E9D5FF', borderRadius: '50%', filter: 'blur(35px)', zIndex: 0 }} />
        {/* Bottom Left: Near 'Cross-Reference' (Teal) */}
        <div style={{ position: 'absolute', bottom: '20%', left: '20%', width: '120px', height: '120px', background: '#99F6E4', borderRadius: '50%', filter: 'blur(35px)', zIndex: 0 }} />
        {/* Bottom Right: Near 'Clinical Trials' (Rose) */}
        <div style={{ position: 'absolute', bottom: '10%', right: '25%', width: '120px', height: '120px', background: '#FECDD3', borderRadius: '50%', filter: 'blur(35px)', zIndex: 0 }} />"""

content = pattern.sub(replacement, content)

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Restored contextual colors to JARVIS (Blue/Purple/Teal/Rose)")
