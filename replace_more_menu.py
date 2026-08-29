import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
'''  .mobile-more-menu-backdrop {
    position: fixed;
    inset: 0;
    background: transparent;
    z-index: 999;
  }''',
'''  .mobile-more-menu-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.15);
    z-index: 999;
  }'''
)

content = content.replace(
'''  .mobile-more-menu {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 70vh;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-top: 1px solid rgba(255, 255, 255, 0.5);
    border-top-left-radius: 28px;
    border-top-right-radius: 28px;
    box-shadow: 0 -10px 40px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    padding-bottom: var(--safe-area-bottom);
  }''',
'''  .mobile-more-menu {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 70vh;
    z-index: 1000;
    background: #FFF9F0;
    border-top: 1px solid #FFEDD5;
    border-top-left-radius: 28px;
    border-top-right-radius: 28px;
    box-shadow: 0 -10px 40px rgba(234, 88, 12, 0.08);
    display: flex;
    flex-direction: column;
    padding-bottom: var(--safe-area-bottom);
  }'''
)

content = content.replace(
'''  .mobile-more-menu__header .close-btn {
    background: #f1f5f9;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    transition: background 0.2s;
  }''',
'''  .mobile-more-menu__header .close-btn {
    background: #FFEDD5;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #FED7AA;
    color: #EA580C;
    cursor: pointer;
    transition: background 0.2s;
  }'''
)

content = content.replace(
'''  .more-menu-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    color: var(--text-main);
    text-decoration: none;
    padding: 16px 8px;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.9);
    box-shadow: 0 4px 20px rgba(0,0,0,0.03), inset 0 0 0 1px rgba(255, 255, 255, 0.5);
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }''',
'''  .more-menu-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    color: var(--text-main);
    text-decoration: none;
    padding: 16px 8px;
    background: #FFFFFF;
    border-radius: 20px;
    border: 1px solid #FFEDD5;
    box-shadow: 0 4px 20px rgba(234, 88, 12, 0.04);
    text-align: center;
    font-size: 12px;
    font-weight: 700;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }'''
)

content = content.replace(
'''  .more-menu-icon {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: #EFF6FF;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--teal);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease;
    flex-shrink: 0;
  }

  .more-menu-icon svg {
    color: var(--teal);
    width: 22px;
    height: 22px;
    stroke-width: 2.2px;
    background: transparent;
    padding: 0;
    pointer-events: none;
  }

  .more-menu-item:active .more-menu-icon {
    transform: scale(1.1);
    background: #DBEAFE;
  }''',
'''  .more-menu-icon {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: #FFF7ED;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #EA580C;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease;
    flex-shrink: 0;
  }

  .more-menu-icon svg {
    color: #EA580C;
    width: 22px;
    height: 22px;
    stroke-width: 2.2px;
    background: transparent;
    padding: 0;
    pointer-events: none;
  }

  .more-menu-item:active .more-menu-icon {
    transform: scale(1.1);
    background: #FFEDD5;
  }'''
)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
