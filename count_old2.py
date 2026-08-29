with open('restored.tsx', 'r', encoding='utf-16') as f:
    lines = f.readlines()
block = ''.join(lines[127:280])
print("old open braces:", block.count('{'))
print("old close braces:", block.count('}'))
print("old open parens:", block.count('('))
print("old close parens:", block.count(')'))
