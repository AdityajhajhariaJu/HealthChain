import os
import re

def fix_file(path, find_str, replace_str):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Ensure navigate is available
    if 'useNavigate' not in content:
        content = content.replace("import {", "import { useNavigate } from 'react-router-dom';\nimport {", 1)
    
    if 'const navigate = useNavigate()' not in content:
        # Just insert it at the beginning of the component
        # Find the export default function line
        match = re.search(r'export default function \w+\(.*?\)\s*{', content)
        if match:
            content = content[:match.end()] + '\n  const navigate = useNavigate();' + content[match.end():]

    content = content.replace(find_str, replace_str)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file(r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\brand\Pricing.tsx', "window.location.href = '/app';", "navigate('/app');")
fix_file(r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\mdt\MultiSpecialist.tsx', "window.location.href = '/signup';", "navigate('/signup');")
print("Fixed Pricing and MultiSpecialist")
