with open('src/index.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '.bento-card' in line:
        print(f"Found .bento-card at line {i+1}")
