import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find("{/* TAB 4: CLINICAL GUARDRAILS */}")
end_idx = content.find("</AnimatePresence>", start_idx)

if start_idx != -1 and end_idx != -1:
    print(content[start_idx:end_idx])
else:
    print("Not found")
