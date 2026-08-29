with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

acb = '''
@media (max-width: 768px) {
  .active-case-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px;
  }
  .active-case-bar .btn {
    width: 100%;
    justify-content: center;
  }
}
'''
if 'active-case-bar { flex-direction: column' not in css:
    css += '\n' + acb
    with open('src/index.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("Fixed ActiveCaseBar for mobile")
