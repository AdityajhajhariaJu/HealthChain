import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

old_css = '''  .mobile-tab-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(var(--bottom-tab-height) + var(--safe-area-bottom));
    padding-bottom: var(--safe-area-bottom);
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-top: 1px solid rgba(255, 255, 255, 0.8);
    border-radius: 32px 32px 0 0;
    box-shadow: 0 -8px 30px rgba(15, 23, 42, 0.04);
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 100;
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                border-radius 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow 0.3s ease;
    transform-origin: bottom center;
    will-change: transform, opacity, border-radius;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
  }
  
  .mobile-tab-bar.scrolling {
    transform: translateY(12px) scale(0.85);
    border-radius: 40px;
    opacity: 0;
    pointer-events: none;
    box-shadow: 0 0 0 rgba(15, 23, 42, 0);
  }'''

new_css = '''  .mobile-tab-bar {
    position: fixed;
    bottom: max(16px, env(safe-area-inset-bottom, 16px));
    left: 16px;
    right: 16px;
    height: var(--bottom-tab-height);
    padding-bottom: 0;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 99px;
    box-shadow: 0 10px 40px rgba(15, 23, 42, 0.08);
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 100;
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow 0.3s ease;
    transform-origin: center;
    will-change: transform, opacity;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
  }
  
  .mobile-tab-bar.scrolling {
    transform: translateY(100px) scale(0.85);
    opacity: 0;
    pointer-events: none;
    box-shadow: 0 0 0 rgba(15, 23, 42, 0);
  }'''

content = content.replace(old_css, new_css)

# Also fix the AppShell mobile padding to account for the float gap
content = content.replace(
'''  .app-shell__content.mobile {
    padding-top: 64px;
    padding-bottom: calc(var(--bottom-tab-height) + var(--safe-area-bottom));
  }''',
'''  .app-shell__content.mobile {
    padding-top: 64px;
    padding-bottom: calc(var(--bottom-tab-height) + var(--safe-area-bottom) + 24px);
  }'''
)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
