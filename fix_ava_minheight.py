with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "padding: isMobile ? '0' : '0 24px'," in line:
        lines.insert(i+1, "        minHeight: 0,\n")
        break

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Added minHeight: 0 to AvaHealthBuddy root wrapper")
