import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("checked={task.id === 'task_default_done'}", "initialChecked={task.id === 'task_default_done'}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed initialChecked prop")
