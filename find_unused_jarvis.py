import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\jarvis\JarvisInvestigator.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

lucide_match = re.search(r"import\s*\{([^}]+)\}\s*from\s*'lucide-react'", content)
if lucide_match:
    imports_str = lucide_match.group(1)
    imports = [x.strip() for x in imports_str.split(',')]
    
    unused = []
    for imp in imports:
        if not imp: continue
        if content.count(imp) <= 1:
            unused.append(imp)
            
    print(f"Unused lucide-react imports Jarvis: {unused}")
