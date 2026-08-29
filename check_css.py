with open('src/index.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(105, 160):
    print(f"{i+1}: {lines[i].rstrip()}")
