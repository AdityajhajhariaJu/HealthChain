with open('src/components/ui/MindfulHRVCard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(len(lines)-1, -1, -1):
    if 'return (' in lines[i]:
        for j in range(i, min(len(lines), i+30)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
