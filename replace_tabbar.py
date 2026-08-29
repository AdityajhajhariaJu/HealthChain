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
    background: var(--teal-light);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 100;
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
    box-shadow: 0 -8px 30px rgba(15, 23, 42, 0.04);
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 100;
  }'''
)

content = content.replace(
'''  .mobile-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: var(--text-muted);
    background: none;
    border: none;
    padding: 8px 6px;
    font-size: 10px;
    font-weight: 500;
    text-decoration: none;
    transition: color 0.2s;
  }
  
  .mobile-tab.active {
    color: #047857;
  }''',
'''  .mobile-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: #64748B;
    background: transparent;
    border: none;
    padding: 8px 12px;
    font-size: 10px;
    font-weight: 600;
    text-decoration: none;
    transition: color 0.2s;
    -webkit-tap-highlight-color: transparent;
  }
  
  .mobile-tab svg {
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), stroke-width 0.2s;
    stroke-width: 2px;
    transform-origin: bottom center;
  }
  
  .mobile-tab:active svg {
    transform: scale(0.85);
  }
  
  .mobile-tab.active {
    color: #0F766E;
  }
  
  .mobile-tab.active svg {
    transform: scale(1.15) translateY(-2px);
    stroke-width: 2.8px;
  }'''
)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
