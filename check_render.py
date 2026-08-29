with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "if (!id) {" in line:
        for j in range(i, i+65):
            print(lines[j].rstrip())
        break
