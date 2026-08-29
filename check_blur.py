with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'backdropFilter' in line and '32px' not in line:
        print(f"Found blur at {i+1}: {line.strip()}")
