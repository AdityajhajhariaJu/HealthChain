# -*- coding: utf-8 -*-
import sys

with open('src/components/ui/ARGroceryLens.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "animate={{ width: " in line and "%" in line:
        lines[i] = "                    animate={{ width: ${sugarPercentage}% }}\n"

with open('src/components/ui/ARGroceryLens.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Done')
