import os
import re

dashboard = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(dashboard, 'r', encoding='utf-8') as f:
    content = f.read()

words = ['CinematicCheckbox', 'ImmersiveFeatureFeed']
for word in words:
    content = re.sub(r'import\s*\{\s*' + word + r'\s*\}\s*from\s*[^;]+;', '', content)

with open(dashboard, 'w', encoding='utf-8') as f:
    f.write(content)
