import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', padding: '0 24px 16px'",
    "gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', padding: '0 24px 16px'"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated gridTemplateColumns")
