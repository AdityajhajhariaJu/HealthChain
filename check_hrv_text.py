with open('src/components/ui/MindfulHRVCard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'Follow the 4-4-4' in line:
        for j in range(max(0, i-5), min(len(lines), i+5)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
