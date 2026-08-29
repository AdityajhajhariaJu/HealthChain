with open('src/index.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '.aurora-bg::before' in line:
        for j in range(max(0, i-5), min(len(lines), i+2)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
