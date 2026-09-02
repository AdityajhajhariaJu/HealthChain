import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("Music by Mood", "Your Calm Space")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated heading")
