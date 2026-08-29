import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'scrollTimeout.current = setTimeout(() => {\n      setIsScrolling(false);\n    }, 1500);',
    'scrollTimeout.current = setTimeout(() => {\n      setIsScrolling(false);\n    }, 200);'
)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
