import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\services\MemoryService.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("let cachedContext = null;", "")
content = content.replace("let lastProfileHash = '';", "")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed unused vars")
