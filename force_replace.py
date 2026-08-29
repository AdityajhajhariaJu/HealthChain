with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '<nav className={mobile-tab-bar }>' in line:
        lines[i] = "          {!location.pathname.startsWith('/app/ava') && (<nav className={mobile-tab-bar }>\n"
        break

for i, line in enumerate(lines):
    if '</nav>' in line and 'mobile-tab-bar' not in line:
        # verify it's the right one
        is_right = False
        for j in range(i, min(len(lines), i+5)):
            if '<AnimatePresence>' in lines[j]:
                is_right = True
        if is_right:
            lines[i] = "            </nav>)}\n"
            break

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("done")
