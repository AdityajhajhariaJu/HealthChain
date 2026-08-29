import os

filepath = 'src/index.css'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("background: rgba(255, 255, 255, 0.95);", "background: rgba(255, 255, 255, 0.82);\n  border-top: 1px solid rgba(255, 255, 255, 0.3);")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated tab bar to better glassmorphism")
