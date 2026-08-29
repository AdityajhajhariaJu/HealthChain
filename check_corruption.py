with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'â€' in line or '' in line:
        print(f"{i+1}: {line.strip()}")
