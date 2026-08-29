import os
import re

files = [
    'src/features/dashboard/DailySymptomCheckinWidget.tsx',
    'src/components/ui/MindfulHRVCard.tsx',
    'src/components/ui/VitalityPlayground.tsx',
    'src/components/ui/UpgradeToProCard.tsx',
    'src/components/ui/LongevityBioStackCard.tsx'
]

for filepath in files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Replace <div className="card" or <div className={card
        content = re.sub(r'className="card([^"]*)"', r'className="card bento-card\1"', content)
        content = re.sub(r'className={card([^]+)}', r'className={card bento-card\1}', content)
        
        # If the component doesn't use className="card" on its root, we might need to manually inject it.
        # But looking at previous code, they almost all use className="card"
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

print('Done attaching bento-card!')
