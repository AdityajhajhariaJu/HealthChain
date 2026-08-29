with open('src/index.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '!important' in line and 'background' in line:
        print(f"Line {i+1}: {line.strip()}")
