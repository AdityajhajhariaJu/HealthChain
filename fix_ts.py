import sys

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/CaseDashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("difficulty: 'Intermediate' }", "difficulty: 'Intermediate', equipment: [], is_premium: false, is_featured: true }")
content = content.replace("difficulty: 'Advanced' }", "difficulty: 'Advanced', equipment: [], is_premium: false, is_featured: true }")
content = content.replace("difficulty: 'Beginner'\n                    }", "difficulty: 'Beginner',\n                      equipment: [],\n                      is_premium: false,\n                      is_featured: true\n                    }")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Added missing properties to FitnessContent mock objects.')
