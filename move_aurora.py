import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

# I want to take the aurora css out of .app-shell and make it a standalone component or class
css = css.replace('.app-shell-mesh {', '.aurora-mesh {')
css = css.replace('.app-shell::before', '.aurora-bg::before')
css = css.replace('.app-shell::after', '.aurora-bg::after')

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("CSS updated.")
