import os
import re

root_dir = 'src'

# We'll define a set of regex patterns and replacements to catch the major glass components
replacements = [
    (
        # The specific 0.45 / blur(30px) block found in CaseDashboard, QuickConsult, etc.
        re.compile(r"background:\s*'linear-gradient\(135deg,\s*rgba\(255,\s*255,\s*255,\s*0\.45\)\s*0%,\s*rgba\(255,\s*255,\s*255,\s*0\.05\)\s*100%\)',\s*\n\s*backdropFilter:\s*'blur\(30px\)',\s*\n\s*WebkitBackdropFilter:\s*'blur\(30px\)',\s*\n\s*border:\s*'1px solid rgba\(255,\s*255,\s*255,\s*0\.8\)',\s*\n\s*borderRadius:\s*'32px',\s*\n\s*boxShadow:\s*'0 16px 40px rgba\(0,\s*0,\s*0,\s*0\.05\),\s*inset 0 2px 0 rgba\(255,255,255,0\.7\),\s*inset 0 0 30px rgba\(255,255,255,0\.3\)',?"),
        """background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              borderRadius: '32px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)'"""
    ),
    (
        # Same thing but with single line formats
        re.compile(r"background:\s*'linear-gradient\(135deg,\s*rgba\(255,255,255,0\.45\)\s*0%,\s*rgba\(255,255,255,0\.05\)\s*100%\)',\s*backdropFilter:\s*'blur\(30px\)',\s*WebkitBackdropFilter:\s*'blur\(30px\)'"),
        "background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)'"
    ),
    (
        # The isMobile variant in AvaHealthBuddy
        re.compile(r"background:\s*isMobile\s*\?\s*'transparent'\s*:\s*'rgba\(255,\s*255,\s*255,\s*0\.45\)',\s*\n\s*backdropFilter:\s*isMobile\s*\?\s*'none'\s*:\s*'blur\([^)]+\)',\s*\n\s*WebkitBackdropFilter:\s*isMobile\s*\?\s*'none'\s*:\s*'blur\([^)]+\)',\s*\n\s*borderRadius:\s*isMobile\s*\?\s*'0'\s*:\s*'32px',\s*\n\s*flexDirection:\s*'column',\s*\n\s*position:\s*'relative',\s*\n\s*overflow:\s*'hidden',\s*\n\s*border:\s*isMobile\s*\?\s*'none'\s*:\s*'1px solid rgba\(255,\s*255,\s*255,\s*0\.4\)',?"),
        """background: isMobile ? 'transparent' : 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)',
            backdropFilter: isMobile ? 'none' : 'blur(32px)',
            WebkitBackdropFilter: isMobile ? 'none' : 'blur(32px)',
            borderRadius: isMobile ? '0' : '32px',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            border: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.8)',
            boxShadow: isMobile ? 'none' : '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)'"""
    )
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for pattern, replacement in replacements:
        new_content = pattern.sub(replacement, new_content)
        
    # More generic replacement for old dense gradients:
    # We want to replace `background: 'rgba(255, 255, 255, 0.6)'` only when it's part of a panel/card and not a simple text color or small div.
    # We'll do a simple replace for `background: 'rgba(255, 255, 255, 0.6)',` but need to be careful to inject the box-shadow correctly.
    # Actually, we can use an AST/regex that replaces:
    # background: 'rgba(255, 255, 255, 0.6)' -> Ultra Sheer
    
    pattern_generic = re.compile(r"background:\s*'rgba\(255,\s*255,\s*255,\s*0\.6\)',\s*\n\s*border:\s*'1px solid rgba\(0,\s*0,\s*0,\s*0\.05\)',\s*\n\s*borderRadius:\s*'20px',\s*\n\s*padding:\s*'24px',\s*\n\s*marginBottom:\s*'32px',\s*\n\s*backdropFilter:\s*'blur\(12px\)',\s*\n\s*WebkitBackdropFilter:\s*'blur\(12px\)',\s*\n\s*boxShadow:\s*'0 4px 12px rgba\(0,0,0,0\.02\)'")
    
    new_content = pattern_generic.sub(
        """background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.8)',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '32px',
      backdropFilter: 'blur(32px)',
      WebkitBackdropFilter: 'blur(32px)',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)'""",
        new_content
    )
    
    # Also for OnboardingFlow.tsx
    pattern_onboarding = re.compile(r"background:\s*'rgba\(255,255,255,0\.6\)',\s*\n\s*border:\s*'1px solid rgba\(15,23,42,0\.12\)',\s*\n\s*borderRadius:\s*'24px',\s*\n\s*padding:\s*'32px',\s*\n\s*backdropFilter:\s*'blur\(16px\)',\s*\n\s*WebkitBackdropFilter:\s*'blur\(16px\)',\s*\n\s*boxShadow:\s*'0 8px 32px rgba\(0,0,0,0\.04\)'")
    new_content = pattern_onboarding.sub(
        """background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.8)',
                      borderRadius: '24px',
                      padding: '32px',
                      backdropFilter: 'blur(32px)',
                      WebkitBackdropFilter: 'blur(32px)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)'""",
        new_content
    )

    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith('.tsx'):
            process_file(os.path.join(root, file))
