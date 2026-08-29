with open('restored.tsx', 'r', encoding='utf-16') as f:
    content = f.read()
print("Restored open:", content.count('{'))
print("Restored close:", content.count('}'))
