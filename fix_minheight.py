import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("minHeight: '260px',\n                    cursor: 'pointer'", "minHeight: '140px',\n                    cursor: 'pointer'")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed task minHeight to 140px")
