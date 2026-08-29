with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '<button className="mobile-top-bar__search"' in line:
        for j in range(max(0, i-5), i+5):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
