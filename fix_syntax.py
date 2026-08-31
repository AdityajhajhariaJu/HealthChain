import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('subtitle={g}', 'subtitle={${targetProtein}g}')
content = content.replace('subtitle={g}', 'subtitle={${targetCarbs}g}')
content = content.replace('subtitle={g}', 'subtitle={${targetFats}g}')
content = content.replace('subtitle={g}', 'subtitle={${targetSugar}g}')
content = content.replace('subtitle={g}', 'subtitle={${targetFibre}g}')
content = content.replace('subtitle={ kcal}', 'subtitle={${targetCalories} kcal}')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed TSX syntax!")
