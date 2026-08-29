import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'bottom: max(16px, env(safe-area-inset-bottom, 16px));',
    'bottom: max(8px, env(safe-area-inset-bottom, 8px));'
)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
