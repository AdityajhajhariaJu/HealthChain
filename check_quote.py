with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for j in range(650, 680):
    print(f"{j+1}: {lines[j].rstrip()}")
