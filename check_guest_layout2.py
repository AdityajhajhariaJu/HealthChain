with open('src/components/ui/GuestStickyBanner.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for j in range(115, 140):
    print(f"{j+1}: {lines[j].rstrip()}")
