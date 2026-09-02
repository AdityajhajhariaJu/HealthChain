import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\auth\Landing.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "background: '#F4FBF7',",
    "background: '#FBF9F6',"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated landing page loading overlay background to premium creme")
