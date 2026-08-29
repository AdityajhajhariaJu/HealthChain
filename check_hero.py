with open('restored.tsx', 'r', encoding='utf-16') as f:
    lines = f.readlines()
for i in range(129, 185):
    print(f"{i}: {lines[i].rstrip()}")
