import sys
import re

files = [
    r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\consultation\QuickConsult.tsx',
    r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\mdt\MDTHub.tsx',
    r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\mdt\MDTComponents.tsx'
]

old_glass = "background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.3) 100%)',\n              backdropFilter: 'blur(32px)',\n              WebkitBackdropFilter: 'blur(32px)',"
old_glass_2 = "background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.3) 100%)',\n                backdropFilter: 'blur(32px)',\n                WebkitBackdropFilter: 'blur(32px)',"

new_glass = "background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.1) 100%)',\n              backdropFilter: 'blur(32px)',\n              WebkitBackdropFilter: 'blur(32px)',"

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Reduce opacity of the glass
    content = content.replace("rgba(255, 255, 255, 0.75)", "rgba(255, 255, 255, 0.6)")
    content = content.replace("rgba(255, 255, 255, 0.3)", "rgba(255, 255, 255, 0.1)")

    # 2. Replace solid borders and shadows that immediately follow the WebkitBackdropFilter line.
    # We can do this with regex.
    # Find block of styles right after WebkitBackdropFilter and replace border/boxShadow if they are the basic grey ones.
    
    # We will just globally replace specific borders and shadows in these files since they were meant for the cards.
    content = content.replace("border: '1px solid #E2E8F0'", "border: '1px solid rgba(255, 255, 255, 0.8)'")
    content = content.replace("borderTop: '1px solid #E2E8F0'", "borderTop: '1px solid rgba(255, 255, 255, 0.8)'")
    content = content.replace("borderBottom: '1px solid #E2E8F0'", "borderBottom: '1px solid rgba(255, 255, 255, 0.8)'")
    
    content = content.replace("boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)'", "boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)'")
    content = content.replace("boxShadow: '0 20px 40px rgba(0,0,0,0.04)'", "boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)'")
    content = content.replace("boxShadow: phase === 'intake' ? 'none' : '0 10px 30px rgba(0,0,0,0.03)'", "boxShadow: phase === 'intake' ? 'none' : '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)'")

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updated glass opacity, border, and inset shadows")
