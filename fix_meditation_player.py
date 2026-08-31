import sys
import re

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/ui/MeditationPlayer.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix initialization bug
content = content.replace(
    'const [timeRemaining, setTimeRemaining] = useState(0);',
    'const [timeRemaining, setTimeRemaining] = useState((content?.duration_minutes || 5) * 60);'
)

# 2. Add createPortal for z-index escaping
if 'createPortal' not in content:
    content = content.replace(
        "import React, { useState, useEffect } from 'react';",
        "import React, { useState, useEffect } from 'react';\nimport { createPortal } from 'react-dom';"
    )

# Wrap return statement in createPortal
# We need to find the main return statement.
# `return (`
if 'return createPortal(' not in content:
    content = re.sub(
        r"return \(\s*<AnimatePresence>",
        r"return createPortal(\n    <AnimatePresence>",
        content
    )
    # The end of the file currently is:
    #     </AnimatePresence>
    #   );
    # };
    content = content.replace(
        "    </AnimatePresence>\n  );\n};",
        "    </AnimatePresence>,\n    document.body\n  );\n};"
    )

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed MeditationPlayer bugs (initialization and z-index context).')
