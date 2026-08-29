import re

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
"color: importedCase ? '#EA580C' : theme.primary,", "color: importedCase ? '#0D9488' : theme.primary,"
)
content = content.replace(
"e.currentTarget.style.borderColor = importedCase ? '#EA580C' : theme.primary;", "e.currentTarget.style.borderColor = importedCase ? '#0D9488' : theme.primary;"
)
content = content.replace(
"// Theme colors - Soothing Purple", "// Theme colors - Serene Spa Teal"
)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
