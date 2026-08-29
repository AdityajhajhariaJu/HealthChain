with open('src/index.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(len(lines)-60, len(lines)):
    if 'bento-card' in lines[i]:
        for j in range(max(0, i-5), min(len(lines), i+20)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
