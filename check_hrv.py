with open('src/components/ui/MindfulHRVCard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines[:50]):
    print(f"{i+1}: {line.rstrip()}")
