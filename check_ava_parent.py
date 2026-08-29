with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '{/* Header */}' in line:
        for j in range(max(0, i-25), min(len(lines), i+5)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
