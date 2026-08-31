# -*- coding: utf-8 -*-
import sys
import re

with open('src/features/dashboard/ImmersiveFeatureFeed.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'url\(\s*\)', r"url('" + " + cat.image + " + r"')", content)
content = content.replace("backgroundImage: url()", "backgroundImage: 'url(' + cat.image + ')'")
content = content.replace("backgroundImage: url()", "backgroundImage: 'url(' + action.image + ')'")

# let's just use replace on lines
lines = content.split('\n')
for i, line in enumerate(lines):
    if "backgroundImage:" in line and "url" in line and "cat.image" not in line and "action.image" not in line and "/images/immersive/personalized-meal.png" not in line:
        if "cat" in lines[i-2] or "cat" in lines[i-3] or "cat" in lines[i+1]:
            lines[i] = "              backgroundImage: 'url(' + cat.image + ')', backgroundSize: 'cover', backgroundPosition: 'center',"
        elif "action" in lines[i-2] or "action" in lines[i-3] or "action" in lines[i+1]:
            lines[i] = "                backgroundImage: 'url(' + action.image + ')', backgroundSize: 'cover', backgroundPosition: 'center',"

with open('src/features/dashboard/ImmersiveFeatureFeed.tsx', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print('Done')
