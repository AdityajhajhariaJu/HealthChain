import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'Audio by Mood' in line or 'Soundscapes' in line or 'Music by Mood' in line:
        start = max(0, i - 10)
        end = min(len(lines), i + 40)
        print("".join(lines[start:end]))
        break
