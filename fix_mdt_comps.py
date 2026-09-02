import sys
import re

mdt_comps_path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\mdt\MDTComponents.tsx'
with open(mdt_comps_path, 'r', encoding='utf-8') as f:
    comps = f.read()

comps = comps.replace(
    "background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.1) 100%)',\n                backdropFilter: 'blur(32px)',",
    "background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)',\n                backdropFilter: 'blur(32px)',\n                border: '1px solid rgba(255, 255, 255, 0.8)',\n                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.05), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.3)',"
)

with open(mdt_comps_path, 'w', encoding='utf-8') as f:
    f.write(comps)

print("Fixed inner glass panels in MDTComponents")
