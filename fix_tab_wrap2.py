import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace flexWrap: 'nowrap' in the specific container
target = r"overflowX: 'auto',\s*width: isMobile \? '100%' : 'auto',\s*maxWidth: '100%',\s*flexWrap: 'nowrap',"
replacement = r"overflowX: 'visible', width: isMobile ? '100%' : 'auto', maxWidth: '100%', flexWrap: 'wrap',"

content = re.sub(target, replacement, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated tab selector to wrap")
