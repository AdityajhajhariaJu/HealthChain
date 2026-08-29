with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

old_blur = '''    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);'''

new_blur = '''    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.4);'''

css = css.replace(old_blur, new_blur)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("Updated blur and added border")
