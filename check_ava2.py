with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(310, 335):
    print(f"{i+1}: {lines[i].rstrip()}")
