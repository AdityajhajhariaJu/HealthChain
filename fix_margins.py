import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("margin: '0 -24px'", "margin: 0")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed negative margins in CaseDashboard.tsx")
