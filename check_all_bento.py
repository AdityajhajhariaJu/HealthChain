with open('src/index.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'bento-card' in line:
        for j in range(max(0, i-2), min(len(lines), i+8)):
            print(f"{j+1}: {lines[j].rstrip()}")
        print('---')
