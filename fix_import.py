import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("Pin} from 'lucide-react';", "Pin, Scan} from 'lucide-react';")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Imported Scan")
