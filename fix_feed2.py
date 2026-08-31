# -*- coding: utf-8 -*-
import sys

with open('src/features/dashboard/ImmersiveFeatureFeed.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("backgroundImage: url(' + cat.image + '),", "backgroundImage: 'url(' + cat.image + ')',")
content = content.replace("backgroundImage: url(' + action.image + '),", "backgroundImage: 'url(' + action.image + ')',")

# wait, in my previous python script I wrote:
# "              backgroundImage: 'url(' + cat.image + ')', backgroundSize: 'cover', backgroundPosition: 'center',"
# Oh! The single quotes inside a double quote in python string made it output 'url(' + cat.image + ')' !
# But in React, style={{ backgroundImage: 'url(' + cat.image + ')' }} IS valid JavaScript string concatenation!
# Wait, why was there an error? The error was BEFORE I ran fix_feed.py.
# The error was Cannot find name 'url'.
# Let's write the correct ones.

lines = content.split('\n')
for i, line in enumerate(lines):
    if "backgroundImage: url(" in line and "cat.image" in line:
        lines[i] = "              backgroundImage: 'url(' + cat.image + ')', backgroundSize: 'cover', backgroundPosition: 'center',"
    elif "backgroundImage: url(" in line and "action.image" in line:
        lines[i] = "                backgroundImage: 'url(' + action.image + ')', backgroundSize: 'cover', backgroundPosition: 'center',"

with open('src/features/dashboard/ImmersiveFeatureFeed.tsx', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print('Done')
