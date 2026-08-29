with open('src/index.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '.brand-pulse {' in line:
        for j in range(i, min(len(lines), i+15)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
