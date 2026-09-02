import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { Scan , Sparkles, Loader2} from 'lucide-react';", "import { Scan } from 'lucide-react';")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed duplicate imports")
