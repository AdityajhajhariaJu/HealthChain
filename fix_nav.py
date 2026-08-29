import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<nav className={mobile-tab-bar }>',
    '<nav className={`mobile-tab-bar ${isScrolling ? \'scrolling\' : \'\'}`}>'
)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
