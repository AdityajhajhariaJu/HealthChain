with open('src/features/profile/Settings.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(250, 310):
    print(f"{i+1}: {lines[i].rstrip()}")
