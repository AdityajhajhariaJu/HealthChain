with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(50, len(lines)):
    if '<MindfulHRVCard' in lines[i]:
        for j in range(max(0, i-5), min(len(lines), i+5)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
