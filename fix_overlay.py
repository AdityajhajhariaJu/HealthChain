import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\ARGroceryLens.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the style block for the Results Overlay motion.div
old_style = """              style={{
                position: 'absolute', bottom: '40px', left: '20px', right: '20px', zIndex: 20,
                display: 'flex', flexDirection: 'column', gap: '12px'
              }}"""

new_style = """              style={{
                position: 'absolute', bottom: '40px', left: '20px', right: '20px', zIndex: 20,
                display: 'flex', flexDirection: 'column', gap: '12px',
                maxHeight: 'calc(100vh - 140px)', overflowY: 'auto',
                paddingBottom: '20px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch'
              }}"""

content = content.replace(old_style, new_style)

# Also fix the Warning box which is currently 'width: fit-content' and doesn't handle long text well
old_warning = """                {analysis?.warning && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF2F2', padding: '6px 12px', borderRadius: '8px', width: 'fit-content', marginBottom: '16px' }}>"""

new_warning = """                {analysis?.warning && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#FEF2F2', padding: '12px', borderRadius: '12px', width: '100%', marginBottom: '16px' }}>"""

content = content.replace(old_warning, new_warning)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated overlay styles")
