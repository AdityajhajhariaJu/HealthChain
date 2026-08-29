with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for j in range(514, min(len(lines), 570)):
    print(f"{j+1}: {lines[j].rstrip()}")
