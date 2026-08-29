with open('src/index.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for j in range(105, 115):
    print(f"{j+1}: {lines[j].rstrip()}")
