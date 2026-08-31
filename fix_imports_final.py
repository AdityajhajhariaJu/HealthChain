# -*- coding: utf-8 -*-
import sys

with open('src/features/dietician/Dietician.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
imports = "import { ARGroceryLens } from '../../components/ui/ARGroceryLens';\nimport { Scan } from 'lucide-react';\n"
if "ARGroceryLens" not in content[:500]:
    content = imports + content

# Add state
state_replace_target = "const [isLogModalOpen, setIsLogModalOpen] = useState(false);"
if state_replace_target in content and "showARLens" not in content:
    content = content.replace(state_replace_target, state_replace_target + "\n  const [showARLens, setShowARLens] = useState(false);")

with open('src/features/dietician/Dietician.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
