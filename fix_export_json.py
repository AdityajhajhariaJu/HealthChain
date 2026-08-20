import re

with open('src/features/mdt/MDTComponents.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to find the Export JSON button block and remove it.
# The button block looks like:
# <button onClick={() => { ... download Logic ... }} style={{...}}>Export JSON</button>

pattern = r'<button[^>]*?onClick=\{\(\) => \{\s*const blob = new Blob[^>]*?\}\}[^>]*?>\s*Export JSON\s*</button>'
content = re.sub(pattern, '', content, flags=re.DOTALL)

with open('src/features/mdt/MDTComponents.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
