with open('src/components/ui/GuestStickyBanner.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'return (' in line:
        for j in range(i, min(len(lines), i+60)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
