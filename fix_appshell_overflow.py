with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '<main className={pp-shell__content' in line:
        old_line = line
        # Insert overflowY: isMobile && location.pathname.startsWith('/app/ava') ? 'hidden' : 'auto'
        new_line = line.replace(
            "paddingTop: isMobile && location.pathname.startsWith('/app/ava') ? '0px' : undefined,",
            "overflowY: isMobile && location.pathname.startsWith('/app/ava') ? 'hidden' : 'auto', paddingTop: isMobile && location.pathname.startsWith('/app/ava') ? '0px' : undefined,"
        )
        lines[i] = new_line
        break

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Updated AppShell inline styles")
