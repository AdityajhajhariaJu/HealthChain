# -*- coding: utf-8 -*-
import sys

with open('src/components/ui/ARGroceryLens.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("animate={{ width: % }}", "animate={{ width: ${sugarPercentage}% }}")

with open('src/components/ui/ARGroceryLens.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
