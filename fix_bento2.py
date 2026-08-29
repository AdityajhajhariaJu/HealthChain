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

        parts = content.split('return (\n')
        if len(parts) >= 2:
            last_part = parts[-1]
            last_part = re.sub(r'^( *<div )', r'\g<1>className="bento-card" ', last_part)
            last_part = re.sub(r'^( *<section )', r'\g<1>className="bento-card" ', last_part)
            last_part = re.sub(r'^( *<div\n)', r'\g<1>        className="bento-card"\n', last_part)
            last_part = re.sub(r'^( *<section\n)', r'\g<1>        className="bento-card"\n', last_part)
            
            last_part = re.sub(r'marginBottom:\s*\'?[0-9]+px\'?,?', '', last_part)
            last_part = re.sub(r'marginBottom:\s*[0-9]+,?', '', last_part)
            
            content = 'return (\n'.join(parts[:-1]) + 'return (\n' + last_part
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

print('Done fixing bento cards!')
