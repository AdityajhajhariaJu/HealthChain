with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'messages.map' in line or 'Input Area' in line:
        print(f"Found at {i+1}: {line.strip()}")
