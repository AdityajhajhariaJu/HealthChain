with open('src/index.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "app-shell-mesh" in line:
        start = max(0, i - 15)
        end = min(len(lines), i + 35)
        for j in range(start, end):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
