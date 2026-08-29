with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "You've explained your symptoms" in line:
        lines[i] = "        You've explained your symptoms to five different doctors. Your labs come back \\\"normal,\\\" but you still feel terrible.,\n"

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Fixed syntax")
