with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

old_block = ''.join(lines[127:280])
print("old div open:", old_block.count('<div'))
print("old div close:", old_block.count('</div'))
