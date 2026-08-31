# -*- coding: utf-8 -*-
import sys

with open('src/features/dashboard/ImmersiveFeatureFeed.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
for i, line in enumerate(lines):
    if "backgroundImage: 'url(' + cat.image + ')'," in line:
        if "action" in lines[i-2] or "action" in lines[i-3] or "action" in lines[i+1] or "action.text" in lines[i+4]:
            lines[i] = "                backgroundImage: 'url(' + action.image + ')', backgroundSize: 'cover', backgroundPosition: 'center',"

with open('src/features/dashboard/ImmersiveFeatureFeed.tsx', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print('Done')
