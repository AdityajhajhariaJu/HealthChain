import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the specific padding for the Day button
target = r"padding: '10px 18px',\s*borderRadius: '12px',\s*border: `1px solid"
replacement = r"flexShrink: 0, padding: '10px 18px', borderRadius: '12px', border: `1px solid"

content = re.sub(target, replacement, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added flexShrink: 0 to Day buttons")
