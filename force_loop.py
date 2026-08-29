with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'mobile-tab-bar' in line and 'nav className' in line:
        lines[i] = "          {!location.pathname.startsWith('/app/ava') && (\n" + line
        break

for i, line in enumerate(lines):
    if '</nav>' in line and 'mobile-tab-bar' not in line:
        is_closing = False
        for j in range(i, min(len(lines), i+5)):
            if 'AnimatePresence' in lines[j]:
                is_closing = True
        if is_closing:
            lines[i] = "            </nav>\n          )}\n"
            break

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Loop replace done")
