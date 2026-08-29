with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_str = "'You've explained your symptoms to five different doctors. Your labs come back \"normal,\" but you still feel terrible.',"
new_str = "You've explained your symptoms to five different doctors. Your labs come back \"normal,\" but you still feel terrible.,"
content = content.replace(old_str, new_str)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed syntax error")
