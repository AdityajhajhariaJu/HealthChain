import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add Sparkles and Loader2 to lucide-react imports
content = re.sub(
    r"import \{([^}]+)\} from 'lucide-react';", 
    lambda m: f"import {{{m.group(1)}, Sparkles, Loader2}} from 'lucide-react';" if 'Sparkles' not in m.group(1) else m.group(0), 
    content,
    count=1
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added missing imports")
