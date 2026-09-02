import sys
import re

for filepath in [r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\services\MemoryService.js', r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\services\ProfileEngine.js']:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find empty catch blocks and add console.error
    content = re.sub(r'catch\s*\(([^)]+)\)\s*\{\s*\}', r"catch (\1) { console.error(\1); }", content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Regex replace complete")
