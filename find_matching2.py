with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
content = ''.join(lines[126:])
open_p = 0
for i in range(len(content)):
    if content[i] == '(': open_p += 1
    elif content[i] == ')':
        open_p -= 1
        if open_p == 0:
            print("Matching ) found at line:")
            lines_so_far = content[:i].count('\n') + 127
            print(f"Line {lines_so_far}")
            break
