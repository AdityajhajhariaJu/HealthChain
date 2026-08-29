with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('opacity: 0.6;', 'opacity: 0.8;')
content = content.replace('rgba(16, 185, 129, 0.12)', 'rgba(16, 185, 129, 0.25)')
content = content.replace('rgba(34, 197, 94, 0.12)', 'rgba(34, 197, 94, 0.25)')
content = content.replace('rgba(20, 184, 166, 0.12)', 'rgba(20, 184, 166, 0.25)')

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print("Bumped aurora opacity slightly")
