with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '<nav className={mobile-tab-bar' in line:
        for j in range(max(0, i-2), min(len(lines), i+5)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
