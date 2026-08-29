with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    ".app-shell__content {\\n    width: 100%;\\n    flex: 1;",
    ".app-shell__content {\\n    width: 100%;\\n    flex: 1;\\n    min-height: 0;"
)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added min-height: 0 to app-shell__content")
