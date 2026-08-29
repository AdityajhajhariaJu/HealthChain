import re
with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'<nav className=\{mobile-tab-bar \$\{isScrolling \? \'scrolling\' : \'\'\}\}>', r"{!location.pathname.startsWith('/app/ava') && (<nav className={mobile-tab-bar }>", content)

content = re.sub(r'</nav>\s*<AnimatePresence>', r"</nav>)}\n            <AnimatePresence>", content)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Regex replace done")
