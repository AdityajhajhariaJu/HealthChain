import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { Scan } from 'lucide-react';", "import { Scan, Sparkles } from 'lucide-react';")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added Sparkles import")
