with open('restored.tsx', 'r', encoding='utf-16') as f:
    lines = f.readlines()
old_block = ''.join(lines[127:280])

import re

# find all unclosed divs in old_block by simulating a stack
stack = []
for m in re.finditer(r'<div[^>]*>|</div>|<div[^>]*/>', old_block):
    tag = m.group(0)
    if tag.startswith('</div'):
        if stack: stack.pop()
    elif tag.endswith('/>'):
        pass # self closing
    else:
        stack.append(tag)

print("Unclosed divs in old block:")
for t in stack:
    print(t[:50])
