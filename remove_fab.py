import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the AR Lens FAB block
content = re.sub(r'\{\s*/\*\s*AR Lens FAB\s*\*/\s*\}.*?<Scan size=\{24\} />\s*</button>', '', content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed floating AR Lens FAB.")
