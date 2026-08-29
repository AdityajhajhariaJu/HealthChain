with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '<div' in line:
        for j in range(i, i+30):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
