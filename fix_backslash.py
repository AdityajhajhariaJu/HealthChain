with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('\.mobile-tab-bar {', '.mobile-tab-bar {')

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed backslash")
