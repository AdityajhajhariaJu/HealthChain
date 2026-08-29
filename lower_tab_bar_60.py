import os

filepath = 'src/index.css'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the bottom spacing
old_bottom = "bottom: calc(env(safe-area-inset-bottom, 12px) + 12px);"
new_bottom = "bottom: calc(env(safe-area-inset-bottom, 8px) + 4px);"
content = content.replace(old_bottom, new_bottom)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Lowered mobile tab bar")
