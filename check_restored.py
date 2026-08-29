with open('restored.tsx', 'r', encoding='utf-16') as f:
    lines = f.readlines()
for i in range(275, 305):
    print(f"{i+1}: {lines[i].rstrip()}")
