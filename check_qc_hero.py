with open('src/features/consultation/QuickConsult.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "initial={{ opacity: 0, y: 20, backgroundPosition: '0% 50%' }}" in line:
        for j in range(max(0, i-5), min(len(lines), i+30)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
