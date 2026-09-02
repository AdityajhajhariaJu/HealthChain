import os
import re

dashboard = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
jarvis = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\jarvis\JarvisInvestigator.tsx'

def remove_unused(path, words):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for word in words:
        # Regex to remove `word, ` or `, word` or `word` from imports
        content = re.sub(r',\s*' + word + r'\b', '', content)
        content = re.sub(r'\b' + word + r'\s*,', '', content)
        content = re.sub(r'import\s*\{\s*' + word + r'\s*\}\s*from\s*[^;]+;', '', content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

remove_unused(dashboard, ['CinematicCheckbox'])
remove_unused(jarvis, ['BrainCircuit'])
print("Cleaned up unused imports.")
