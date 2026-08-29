with open('src/index.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '.aurora-bg {' in line or '.aurora-bg{' in line:
        for j in range(max(0, i-2), min(len(lines), i+8)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
