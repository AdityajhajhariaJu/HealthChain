with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '{/* Header */}' in line:
        for j in range(i, i+15):
            if "background: 'transparent'," in lines[j]:
                lines[j] = "            background: 'rgba(255, 241, 242, 0.65)',\n"
                break
        break

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Updated Ava header background")
