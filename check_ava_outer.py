with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'return (' in line:
        for j in range(max(0, i), min(len(lines), i+15)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
