with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re
m = re.search(r'return \(\s*<div', content)
start = m.start()
print("return ( found at index", start)

# find the matching closing paren
open_p = 0
for i in range(start + 6, len(content)):
    if content[i] == '(': open_p += 1
    elif content[i] == ')':
        open_p -= 1
        if open_p == 0:
            print("Matching ) found at index", i)
            print("Line around matching ):")
            print(content[i-50:i+50])
            break
