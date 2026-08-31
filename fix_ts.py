import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("awardPoints(2, '🛡️ Shield Activated', 'health'", "awardPoints(2, '🛡️ Shield Activated', 'lifestyle'")

# Remove duplicate imports
# They are on lines 35, 45, 59, 61. Let's just find "Droplet," and "Flame," and remove extra occurrences.
# Alternatively, I can just use a regex to clean up the lucide-react import
import_block = re.search(r"import\s+\{([^}]+)\}\s+from\s+'lucide-react'", content)
if import_block:
    imports = [x.strip() for x in import_block.group(1).split(',')]
    unique_imports = list(dict.fromkeys(imports))
    if '' in unique_imports:
        unique_imports.remove('')
    new_import = "import { " + ", ".join(unique_imports) + " } from 'lucide-react'"
    content = content[:import_block.start()] + new_import + content[import_block.end():]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed TS errors")
