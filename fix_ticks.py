import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("subtitle={${targetProtein}g}", "subtitle={`{targetProtein}g`}".replace('{targetProtein}', '${targetProtein}'))
content = content.replace("subtitle={${targetCarbs}g}", "subtitle={`{targetCarbs}g`}".replace('{targetCarbs}', '${targetCarbs}'))
content = content.replace("subtitle={${targetSugar}g}", "subtitle={`{targetSugar}g`}".replace('{targetSugar}', '${targetSugar}'))
content = content.replace("subtitle={${targetFibre}g}", "subtitle={`{targetFibre}g`}".replace('{targetFibre}', '${targetFibre}'))
content = content.replace("subtitle={${targetFats}g}", "subtitle={`{targetFats}g`}".replace('{targetFats}', '${targetFats}'))
content = content.replace("subtitle={${targetCalories} kcal}", "subtitle={`{targetCalories} kcal`}".replace('{targetCalories}', '${targetCalories}'))

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
