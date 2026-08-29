import os

filepath = 'src/components/layout/AppShell.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Make the sidebar logo beautifully rounded
content = content.replace("style={{ width: '38px', height: '38px', objectFit: 'contain' }}", "style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AppShell logo styling")
