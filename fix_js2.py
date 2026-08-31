# -*- coding: utf-8 -*-
import sys
import re

with open('src/components/ui/ARGroceryLens.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'animate=\{\{ width: \$\{sugarPercentage\}% \}\}', r'animate={{ width: ${sugarPercentage}% }}', content)

with open('src/components/ui/ARGroceryLens.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
