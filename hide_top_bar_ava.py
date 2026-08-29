import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Hide mobile-top-bar on /app/ava
old_top_bar = '''        {isMobile && (
          <>
            <div className="mobile-top-bar">'''

new_top_bar = '''        {isMobile && (
          <>
            {!location.pathname.startsWith('/app/ava') && (
              <div className="mobile-top-bar">'''

content = content.replace(old_top_bar, new_top_bar)

# Add closing tag for the new condition block
old_close = '''                </div>
            </div>
            <nav className={mobile-tab-bar }>'''

new_close = '''                </div>
              </div>
            )}
            <nav className={mobile-tab-bar }>'''

content = content.replace(old_close, new_close)

# Remove padding-top from main content when on /app/ava
old_main = '''<main className={pp-shell__content } id="main-content" onScroll={handleMainScroll}>'''
new_main = '''<main className={pp-shell__content } id="main-content" onScroll={handleMainScroll} style={{ paddingTop: isMobile && location.pathname.startsWith('/app/ava') ? '0px' : undefined }}>'''

content = content.replace(old_main, new_main)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AppShell to hide top bar on Ava")
