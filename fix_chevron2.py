import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(
    r'<button\s+style=\{\{\s*padding: \'8px 12px\',\s*background: \'#FFF\',\s*border: \'1px solid #E2E8F0\',\s*borderRadius: \'12px\',\s*cursor: \'pointer\',\s*display: \'flex\',\s*alignItems: \'center\',\s*\}\}\s*>\s*<ChevronLeft size=\{18\} />\s*</button>',
    r'''<button onClick={() => { const d = parseLocalDate(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(formatLocalDate(d)); }} style={{ padding: '8px 12px', background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ChevronLeft size={18} /></button>''',
    content
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Dietician.tsx ChevronLeft")
