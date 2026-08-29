with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

css = css.replace('''.brand-pulse {
  min-height: 82px;
  width: 100%;''', '''.brand-pulse {
  min-height: 82px;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto 8px auto;''')

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("Constrained BrandPulseBanner width")
