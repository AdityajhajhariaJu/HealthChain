with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(r"if\s*\(\s*searchParams\.has\('caseId'\)\s*&&\s*phase\s*===\s*'intake'\s*\)\s*\{\s*setPhase\('dashboard'\);\s*\}", "", content)

with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
