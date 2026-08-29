with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'removeAttachment' in line:
        for j in range(max(0, i-4), min(len(lines), i+3)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
