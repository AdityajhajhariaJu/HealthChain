with open('src/index.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in [805, 815, 902]:
    print(f"--- Around {i} ---")
    for j in range(max(0, i-5), min(len(lines), i+2)):
        print(f"{j+1}: {lines[j].rstrip()}")
