with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'repeat(12' in line:
        for j in range(max(0, i-2), min(len(lines), i+25)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
