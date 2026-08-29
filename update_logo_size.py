import os

filepath = 'src/components/layout/AppShell.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Make the logo a bit bigger in the sidebar to make it more evident
content = content.replace("style={{ width: '32px', height: '32px', objectFit: 'contain' }}", "style={{ width: '38px', height: '38px', objectFit: 'contain' }}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AppShell logo size")
