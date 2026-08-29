with open('src/features/consultation/QuickConsult.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for j in range(425, 455):
    print(f"{j+1}: {lines[j].rstrip()}")
