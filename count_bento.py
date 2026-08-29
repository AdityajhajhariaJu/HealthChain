with open('bento_line_perfect.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()
block = ''.join(lines)
print("open braces:", block.count('{'))
print("close braces:", block.count('}'))
print("open parens:", block.count('('))
print("close parens:", block.count(')'))
