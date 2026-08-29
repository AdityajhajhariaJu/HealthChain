import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

old_css = '''
.aurora-bg::before,
.aurora-bg::after,
.aurora-mesh {
  content: '';
  position: absolute;
  top: -50%; left: -50%; width: 200%; height: 200%;
  z-index: 0;
  pointer-events: none;
  mix-blend-mode: normal;
  opacity: 0.6;
  filter: blur(60px);
}
'''

new_css = '''
.aurora-bg::before,
.aurora-bg::after,
.aurora-mesh {
  content: '';
  position: fixed;
  top: -50%; left: -50%; width: 200%; height: 200%;
  z-index: -1;
  pointer-events: none;
  mix-blend-mode: normal;
  opacity: 0.6;
  filter: blur(60px);
}
'''

css = css.replace(old_css.strip(), new_css.strip())
with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("CSS updated to fixed positioning.")
