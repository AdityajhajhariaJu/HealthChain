import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\FitnessNav.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure it has flexWrap: 'nowrap'
content = content.replace("display: 'flex', gap: '8px', minWidth: 'min-content', padding: '0 24px'", "display: 'flex', flexWrap: 'nowrap', gap: '8px', minWidth: 'min-content', padding: '0 24px'")
content = content.replace("display: 'flex',\n      gap: '8px',", "display: 'flex',\n      flexWrap: 'nowrap',\n      gap: '8px',")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated FitnessNav")
