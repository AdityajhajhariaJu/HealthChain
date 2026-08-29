import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace the specific mobile-top-bar background
old_bg = "background: rgba(240, 253, 244, 0.95); /* Extremely subtle hint of green */"
new_bg = "background: rgba(255, 255, 255, 0.45); /* Theme agnostic frosted glass */"

css = css.replace(old_bg, new_bg)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("Updated mobile-top-bar background")
