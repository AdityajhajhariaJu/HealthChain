import sys

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/layout/AppShell.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update BrandPulseBanner exclusion
old_brand_pulse = "{!(location.pathname.startsWith('/app/jarvis') || location.pathname.startsWith('/app/consult')) && ("
new_brand_pulse = "{!(location.pathname.startsWith('/app/jarvis') || location.pathname.startsWith('/app/consult') || location.pathname.startsWith('/app/progress') || location.pathname.startsWith('/app/trophies')) && ("
content = content.replace(old_brand_pulse, new_brand_pulse)

# Update ActiveCaseBar exclusion
old_active_case = "{!['/app/today', '/app/consult', '/app/dietician', '/app/medicine-lab', '/app/collab', '/app/case-prep', '/app/settings', '/app/ava', '/app/trials', '/app/profile', '/app/my-cases', '/app/jarvis'].some(p => location.pathname.startsWith(p)) && ("
new_active_case = "{!['/app/today', '/app/consult', '/app/dietician', '/app/medicine-lab', '/app/collab', '/app/case-prep', '/app/settings', '/app/ava', '/app/trials', '/app/profile', '/app/my-cases', '/app/jarvis', '/app/progress', '/app/trophies'].some(p => location.pathname.startsWith(p)) && ("
content = content.replace(old_active_case, new_active_case)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated AppShell exclusions')
