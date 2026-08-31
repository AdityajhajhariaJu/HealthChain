import sys
import re

def fix_portal(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'createPortal' in content:
        return

    # Add import
    content = content.replace(
        "import React, { useState, useEffect } from 'react';",
        "import React, { useState, useEffect } from 'react';\nimport { createPortal } from 'react-dom';"
    )
    content = content.replace(
        "import React, { useEffect } from 'react';",
        "import React, { useEffect } from 'react';\nimport { createPortal } from 'react-dom';"
    )
    
    # Wrap AnimatePresence in createPortal
    content = re.sub(
        r"return \(\s*<AnimatePresence>",
        r"return createPortal(\n    <AnimatePresence>",
        content
    )
    
    # BottomSheetOverlay has:
    #     </AnimatePresence>
    #   );
    # }
    
    # WorkoutPlayer has:
    #     </AnimatePresence>
    #   );
    # };

    content = re.sub(
        r"(\s*</AnimatePresence>\s*\n\s*\);\n};?)",
        r"\n    </AnimatePresence>,\n    document.body\n  );\n}",
        content
    )
    
    # Fix the case where the regex matched `};` at the end
    if content.endswith('};}'):
        content = content[:-1]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_portal('C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/ui/WorkoutPlayer.tsx')
fix_portal('C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/ui/BottomSheetOverlay.tsx')

print("Fixed WorkoutPlayer and BottomSheetOverlay")
