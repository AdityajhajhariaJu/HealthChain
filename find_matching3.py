with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
content = ''.join(lines[127:])
open_p = 0
found_first = False
for i in range(len(content)):
    if content[i] == '(':
        open_p += 1
        found_first = True
    elif content[i] == ')':
        open_p -= 1
        if found_first and open_p == 0:
            lines_so_far = content[:i].count('\n') + 128
            print(f"Matching ) found at line {lines_so_far}")
            print(content[i-30:i+30])
            break
