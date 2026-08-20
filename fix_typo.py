import re

with open('src/features/mdt/MDTHubDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"onClick=\{\(\) => setMobileActiveTab,\n\s*onSpecialistComplete\(i\)\}", "onClick={() => setMobileActiveTab(i)}", content)

with open('src/features/mdt/MDTHubDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
