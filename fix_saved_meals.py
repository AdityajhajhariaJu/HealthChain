import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("onClick={() => onLogMeal('Saved Meal')}", "onClick={() => alert('Saved Meals Library coming soon in v2.0!')}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Saved Meals to alert")
