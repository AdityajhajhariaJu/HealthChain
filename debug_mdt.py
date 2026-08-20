with open('src/features/mdt/MDTHubDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("export function MDTHubDashboard({", "console.log('SpecialistPanel type:', typeof SpecialistPanel, SpecialistPanel);\nexport function MDTHubDashboard({")

with open('src/features/mdt/MDTHubDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
