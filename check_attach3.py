with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for j in range(725, min(len(lines), 740)):
    print(f"{j+1}: {lines[j].rstrip()}")
