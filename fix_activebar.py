with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

css = css.replace('''.active-case-bar {
  width: 100%;''', '''.active-case-bar {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;''')

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("Constrained ActiveCaseBar width")
