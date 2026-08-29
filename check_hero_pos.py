with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '<section' in line:
        for j in range(max(0, i), min(len(lines), i+15)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
