import re

with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"setPhase\('conference'\);"
replacement = "setDashboardTab('specialists');\n        setPhase('dashboard');"

content = re.sub(pattern, replacement, content)

with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
