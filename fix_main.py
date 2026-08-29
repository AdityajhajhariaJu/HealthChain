import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<main className={`app-shell__content ${isMobile ? \'mobile\' : \'\'}`} id="main-content">',
    '<main className={`app-shell__content ${isMobile ? \'mobile\' : \'\'}`} id="main-content" onScroll={handleMainScroll}>'
)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
