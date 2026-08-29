import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

css = css.replace("backdrop-filter: blur(12px);\\n    -webkit-backdrop-filter: blur(12px);", "backdrop-filter: blur(24px);\\n    -webkit-backdrop-filter: blur(24px);\\n    border-bottom: 1px solid rgba(255, 255, 255, 0.3);")

# since regex literal strings with escaped newlines can be finicky in python replace, I'll use simple replace with actual newlines.
