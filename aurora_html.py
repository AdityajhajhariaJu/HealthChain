import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
'''    <div className="app-shell">
      {isMobile ? (
        <main className={pp-shell__content } id="main-content" 
onScroll={handleMainScroll}>''',
'''    <div className="app-shell">
      <div className="app-shell-mesh" />
      {isMobile ? (
        <main className={pp-shell__content } id="main-content" 
onScroll={handleMainScroll}>'''
)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
