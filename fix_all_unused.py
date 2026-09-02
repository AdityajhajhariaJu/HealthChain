import os
import re

def remove_unused(path, words):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for word in words:
        content = re.sub(r',\s*' + word + r'\b', '', content)
        content = re.sub(r'\b' + word + r'\s*,', '', content)
        content = re.sub(r'import\s*\{\s*' + word + r'\s*\}\s*from\s*[^;]+;', '', content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

dashboard = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
jarvis = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\jarvis\JarvisInvestigator.tsx'

remove_unused(dashboard, ['Bike', 'Dumbbell', 'Footprints', 'HeartPulse', 'Moon', 'MoreHorizontal', 'Music', 'Settings2', 'Sparkles', 'Swords', 'Target', 'Zap'])
remove_unused(jarvis, ['ShieldCheck', 'ChevronDown', 'ListChecks'])
print("Cleaned up ALL unused imports.")
