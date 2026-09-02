import sys
import re

files = [
    r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx',
    r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\jarvis\JarvisInvestigator.tsx'
]

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Drop dense opacities to ultra-sheer levels
    content = content.replace("rgba(255, 255, 255, 0.75)", "rgba(255, 255, 255, 0.45)")
    content = content.replace("rgba(255, 255, 255, 0.7)", "rgba(255, 255, 255, 0.45)")
    content = content.replace("rgba(255,255,255,0.6)", "rgba(255,255,255,0.45)")
    
    # We already made one 0.5 in CaseDashboard
    content = content.replace("rgba(255, 255, 255, 0.5)", "rgba(255, 255, 255, 0.45)")
    
    # Reduce the end of the gradient slightly as well to make it clearer
    content = content.replace("rgba(255, 255, 255, 0.3)", "rgba(255, 255, 255, 0.05)")
    content = content.replace("rgba(255, 255, 255, 0.2)", "rgba(255, 255, 255, 0.05)")
    content = content.replace("rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)")
    content = content.replace("rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.05)")
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updated opacity to ultra-sheer glass")
