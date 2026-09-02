import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("name = clickable.getAttribute('href');", "name = clickable.getAttribute('href') || '';")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed App.tsx TS error")
