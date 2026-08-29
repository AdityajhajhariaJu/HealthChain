with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(115, min(130, len(lines))):
    print(f"{i}: {lines[i].rstrip()}")
