with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

css = css.replace("background: rgba(255, 255, 255, 0.25);\\n  backdrop-filter: blur(12px);\\n  -webkit-backdrop-filter: blur(12px);", "background: #FFFFFF;")

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("Updated BrandPulseBanner background")
