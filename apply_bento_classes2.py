import os

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
            
        content = content.replace('className="card"', 'className="card bento-card"')
        content = content.replace('className="card ', 'className="card bento-card ')
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

print('Done attaching bento-card!')
