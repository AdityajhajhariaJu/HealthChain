import os

filepath = 'src/index.css'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("mask-image: linear-gradient(to bottom, black 60%, transparent 100%);\n    -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);", "/* mask removed for clickability */")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed mask-image")
