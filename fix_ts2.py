import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if i == 58 and 'Droplet' in line:
        continue
    if i == 60 and 'Flame' in line:
        continue
    new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Removed duplicate imports")
