import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\layout\AppShell.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "width: '100%', transform: 'translateZ(0)' }}>"
replacement = "width: '100%', maxWidth: '800px', margin: '0 auto', transform: 'translateZ(0)' }}>"

content = content.replace(target, replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated max-width constraint for desktop layout")
