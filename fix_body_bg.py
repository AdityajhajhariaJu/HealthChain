import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\index.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_bg = """body {
  -webkit-text-size-adjust: 100%;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  background:
    radial-gradient(circle at 82% -8%, rgba(5, 150, 105, 0.08), transparent 32%),
    radial-gradient(circle at 45% 0%, rgba(99, 102, 241, 0.055), transparent 28%),
    var(--bg);
  color: var(--text-main);"""

new_bg = """body {
  -webkit-text-size-adjust: 100%;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  background-color: #FBF9F6;
  color: var(--text-main);"""

if old_bg in content:
    content = content.replace(old_bg, new_bg)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully replaced body background")
else:
    print("Could not find the exact old_bg block")
