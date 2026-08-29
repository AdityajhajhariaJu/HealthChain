import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace sparkly-gold-pill
pattern = r'@keyframes goldShimmer \{[\s\S]*?\}\s*\.sparkly-gold-pill \{[\s\S]*?\}\s*\.sparkly-gold-pill svg \{[\s\S]*?\}'

new_css = '''/* Elegant Premium Gold Pill */
.sparkly-gold-pill {
  background: linear-gradient(135deg, rgba(254, 240, 138, 0.95) 0%, rgba(245, 158, 11, 0.8) 100%);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.6);
  color: #78350F !important;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.5);
  transition: all 0.3s ease;
}
.sparkly-gold-pill svg {
  filter: drop-shadow(0 1px 1px rgba(255, 255, 255, 0.5));
}'''

content = re.sub(pattern, new_css, content)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.css for elegant gold pill")
