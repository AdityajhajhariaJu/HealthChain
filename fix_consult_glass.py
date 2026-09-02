import sys
import re

# 1. Update MDTHub.tsx
mdt_path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\mdt\MDTHub.tsx'
with open(mdt_path, 'r', encoding='utf-8') as f:
    mdt = f.read()

# Add border and boxShadow to the main MDTHub container, and make it sheer
mdt = mdt.replace(
    "background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.1) 100%)',\n              backdropFilter: 'blur(32px)',\n              WebkitBackdropFilter: 'blur(32px)',",
    "background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)',\n              backdropFilter: 'blur(32px)',\n              WebkitBackdropFilter: 'blur(32px)',\n              border: '1px solid rgba(255, 255, 255, 0.8)',\n              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)',"
)

with open(mdt_path, 'w', encoding='utf-8') as f:
    f.write(mdt)

# 2. Update QuickConsult.tsx
qc_path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\consultation\QuickConsult.tsx'
with open(qc_path, 'r', encoding='utf-8') as f:
    qc = f.read()

# Make it sheer
qc = qc.replace(
    "background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.1) 100%)',",
    "background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)',"
)

with open(qc_path, 'w', encoding='utf-8') as f:
    f.write(qc)

print("Fixed MDTHub missing border/shadow, and applied ultra-sheer glass everywhere")
