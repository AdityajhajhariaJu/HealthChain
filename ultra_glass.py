import os

filepath = 'src/index.css'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("background: rgba(255, 255, 255, 0.7);", "background: rgba(255, 255, 255, 0.55);")
content = content.replace("backdrop-filter: blur(24px);", "backdrop-filter: blur(32px);")
content = content.replace("-webkit-backdrop-filter: blur(24px);", "-webkit-backdrop-filter: blur(32px);")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated sidebar blur to be ultra-premium")
