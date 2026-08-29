with open('restored.tsx', 'r', encoding='utf-16') as f:
    lines = f.readlines()
for i, line in enumerate(lines[186:280]):
    if "div" in line:
        print(f"{i+186}: {line.strip()}")
