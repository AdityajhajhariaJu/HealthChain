import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace flexWrap: isMobile ? 'wrap' : 'nowrap', with flexWrap: 'nowrap',
content = re.sub(r"flexWrap:\s*isMobile\s*\?\s*'wrap'\s*:\s*'nowrap',", "flexWrap: 'nowrap',", content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated flexWrap")
