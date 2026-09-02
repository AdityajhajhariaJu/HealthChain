import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\jarvis\JarvisInvestigator.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject the wrapper and blobs inside the main container
main_container = "paddingBottom: '100px', position: 'relative' }}>"
wrapper_code = """paddingBottom: '100px', position: 'relative' }}>
      
      {/* Aesthetic background blobs for J.A.R.V.I.S sheer glass card */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', background: '#FFEDD5', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '40%', right: '5%', width: '250px', height: '250px', background: '#FEE2E2', borderRadius: '50%', filter: 'blur(70px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '15%', left: '20%', width: '200px', height: '200px', background: '#FEF3C7', borderRadius: '50%', filter: 'blur(60px)', zIndex: 0 }} />

      <div style={{ 
        position: 'relative',
        zIndex: 1,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.3) 100%)', 
        backdropFilter: 'blur(32px)', 
        WebkitBackdropFilter: 'blur(32px)', 
        border: '1px solid rgba(255, 255, 255, 0.8)', 
        borderRadius: '32px', 
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)', 
        overflow: 'hidden' 
      }}>"""
content = content.replace(main_container, wrapper_code)

# 2. Strip styles from the top div
top_div_pattern = r"""<div\s+style=\{\{\s*background: 'linear-gradient[^}]*borderRadius: '32px 32px 0 0'[^}]*\}\}\s*>"""
top_div_replacement = """<div style={{ padding: isMobile ? '32px 16px' : '48px', position: 'relative' }}>"""
content = re.sub(top_div_pattern, top_div_replacement, content, flags=re.DOTALL)

# 3. Strip styles from the bottom div
bottom_div_pattern = r"""<div style=\{\{\s*background: '#FFF',\s*border: '1px solid #E2E8F0',\s*borderTop: '1px solid rgba\(15,23,42,0\.05\)',\s*borderRadius: '0 0 32px 32px',\s*padding: isMobile \? '24px 16px' : '40px',\s*boxShadow: '0 20px 40px rgba\(15,23,42,0\.06\)'\s*\}\}>"""
bottom_div_replacement = """<div style={{ borderTop: '1px solid rgba(15,23,42,0.05)', padding: isMobile ? '24px 16px' : '40px' }}>"""
content = re.sub(bottom_div_pattern, bottom_div_replacement, content, flags=re.DOTALL)

# 4. Add the closing div right before the final `</div>\n    </>` of the return statement
content = re.sub(r"</div>\s*</>\s*\);\s*}\s*export default", r"  </div>\n      </div>\n    </>\n  );\n}\n\nexport default", content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated JarvisInvestigator.tsx")
