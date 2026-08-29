import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'import { useState, useEffect, useRef } from \'react\';',
    'import React, { useState, useEffect, useRef } from \'react\';'
)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
