with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(668, 672):
    print(f"{i+1}: {lines[i].rstrip()}")
