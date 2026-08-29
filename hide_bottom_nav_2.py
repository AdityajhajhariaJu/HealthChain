import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Hide bottom nav bar
old_nav = '''          <nav className={mobile-tab-bar }>'''
new_nav = '''          {!location.pathname.startsWith('/app/ava') && (
            <nav className={mobile-tab-bar }>'''
content = content.replace(old_nav, new_nav)

# Close the new condition block after the nav closes
old_close = '''                </AnimatePresence>
              </button>
            </nav>
          </>'''
new_close = '''                </AnimatePresence>
              </button>
            </nav>
          )}
          </>'''
content = content.replace(old_close, new_close)

# Fix padding for main-content to handle bottom padding too
old_main = '''<main className={pp-shell__content } id="main-content" onScroll={handleMainScroll} style={{ paddingTop: isMobile && location.pathname.startsWith('/app/ava') ? '0px' : undefined }}>'''
new_main = '''<main className={pp-shell__content } id="main-content" onScroll={handleMainScroll} style={{ 
            paddingTop: isMobile && location.pathname.startsWith('/app/ava') ? '0px' : undefined,
            paddingBottom: isMobile && location.pathname.startsWith('/app/ava') ? 'var(--safe-area-bottom, 12px)' : undefined 
          }}>'''
content = content.replace(old_main, new_main)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AppShell bottom nav")
