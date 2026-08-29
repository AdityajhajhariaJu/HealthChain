with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for j in range(380, 395):
    print(f"{j+1}: {lines[j].rstrip()}")
