import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'\.mobile-tab-bar\s*\{[^}]*\}'
replacement = '''\.mobile-tab-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: calc(var(--bottom-tab-height) + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-top: 1px solid rgba(226, 232, 240, 0.8);
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -8px 32px rgba(15, 23, 42, 0.06);
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 900;
  }'''

# Note: The pattern matches .mobile-tab-bar { ... }. 
# But wait, there's also .mobile-tab-bar.scrolling { ... } and .mobile-tab-bar a { ... }
# The regex [^}]* stops at the first closing brace, which perfectly matches just the .mobile-tab-bar block.

content = re.sub(pattern, replacement, content, count=1)
# remove the escaped backslash in replacement for actual string
content = content.replace('\\.mobile-tab-bar', '.mobile-tab-bar')

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print("Regex replace done")
