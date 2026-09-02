import sys
import re

fpath = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\mdt\MDTComponents.tsx'
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix duplicates: "border: '1px solid rgba(255, 255, 255, 0.8)', border:" -> "border:"
content = re.sub(r"border:\s*'[^']+',\s*border:", "border:", content)
# Fix duplicate boxShadows
content = re.sub(r"boxShadow:\s*'[^']+',\s*boxShadow:", "boxShadow:", content)
# Sometimes they might have different spacing or be separated by newlines
content = re.sub(r"border:\s*'[^']+',\s*\n\s*border:", "\n              border:", content)
content = re.sub(r"boxShadow:\s*'[^']+',\s*\n\s*boxShadow:", "\n              boxShadow:", content)

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Regex cleanup done")
