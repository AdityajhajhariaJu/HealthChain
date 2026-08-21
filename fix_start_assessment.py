import re

with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("setPhase('assessment');", "setDashboardTab('specialists');\n    setPhase('dashboard');")

with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
