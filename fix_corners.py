import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
'''  .mobile-tab-bar {
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
    box-shadow: 0 -8px 30px rgba(15, 23, 42, 0.04);
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 100;
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    transform-origin: bottom center;
  }
  
  .mobile-tab-bar.scrolling {
    transform: translateY(20px) scale(0.95);
    opacity: 0.6;
    pointer-events: none;
  }''',
'''  .mobile-tab-bar {
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
                border-radius 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    transform-origin: bottom center;
  }
  
  .mobile-tab-bar.scrolling {
    transform: translateY(12px) scale(0.85);
    border-radius: 40px;
    opacity: 0;
    pointer-events: none;
  }'''
)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
