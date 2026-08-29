import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace the translucent glass with solid white for BrandPulse
old_block = '''  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);'''

new_block = '''  background: #FFFFFF;'''

css = css.replace(old_block, new_block)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("Updated BrandPulseBanner to solid white")
