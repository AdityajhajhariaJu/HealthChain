with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'lucide-react' in line:
        for j in range(max(0, i-15), i+1):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
