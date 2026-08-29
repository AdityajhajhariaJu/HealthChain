with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(len(lines)-1, -1, -1):
    if 'return (' in lines[i]:
        for j in range(i, min(len(lines), i+60)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
