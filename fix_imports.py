# -*- coding: utf-8 -*-
import sys

with open('src/features/dietician/Dietician.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if "ARGroceryLens" not in content:
    content = content.replace("import { motion, AnimatePresence } from 'framer-motion';", "import { motion, AnimatePresence } from 'framer-motion';\nimport { ARGroceryLens } from '../../components/ui/ARGroceryLens';\nimport { Scan } from 'lucide-react';")

# Add state
if "showARLens" not in content:
    content = content.replace("const [isLogModalOpen, setIsLogModalOpen] = useState(false);", "const [isLogModalOpen, setIsLogModalOpen] = useState(false);\n  const [showARLens, setShowARLens] = useState(false);")

with open('src/features/dietician/Dietician.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
