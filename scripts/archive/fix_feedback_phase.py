import re

with open('src/features/mdt/MDTHubDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("setPhase('assessment');", "setDashboardTab('specialists');\n            setPhase('dashboard');")

with open('src/features/mdt/MDTHubDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("setPhase('assessment');", "setDashboardTab('specialists');\n                    setPhase('dashboard');")

# Also delete the dead code for 'select' and 'assessment' phases
content = re.sub(r"\{phase === 'select' && \(.*?\)\}", "", content, flags=re.DOTALL)
content = re.sub(r"\{phase === 'assessment' && \(.*?\)\}", "", content, flags=re.DOTALL)

with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
