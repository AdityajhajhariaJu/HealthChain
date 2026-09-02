import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add flexShrink: 0
content = content.replace("<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>", "<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated CircularProgress flexShrink")
