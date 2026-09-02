import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Reduce CircularProgress gap
content = content.replace(
    "flexDirection: 'column', alignItems: 'center', gap: '8px'",
    "flexDirection: 'column', alignItems: 'center', gap: '4px'"
)

# 2. Reduce the grid padding and gap
content = content.replace(
    "padding: '36px 24px',",
    "padding: '20px 24px',"
)

content = content.replace(
    "gap: '40px 24px',",
    "gap: '20px 24px',"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Compressed vertically!")
