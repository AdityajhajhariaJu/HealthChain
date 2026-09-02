import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "export const CUISINES = ['North Indian', 'South Indian', 'Mediterranean', 'Western', 'Keto', 'Any'];",
    "export const CUISINES = ['North Indian', 'South Indian', 'Mediterranean', 'Middle Eastern', 'Mexican', 'East Asian', 'Western', 'Keto', 'Any'];"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated CUISINES.")
