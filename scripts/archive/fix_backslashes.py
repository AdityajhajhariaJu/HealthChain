import re

with open('src/features/mdt/MDTComponents.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(r"\'", "'")

with open('src/features/mdt/MDTComponents.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
