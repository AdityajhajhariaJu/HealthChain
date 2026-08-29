with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
lines.insert(451, "            )}\n")
with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Added missing )}")
