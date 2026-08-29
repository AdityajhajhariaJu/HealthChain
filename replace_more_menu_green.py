import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
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
  }''',
'''  .more-menu-icon {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: #F0FDFA;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0F766E;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease;
    flex-shrink: 0;
  }'''
)

content = content.replace(
'''  .more-menu-icon svg {
    color: #EA580C;
    width: 22px;
    height: 22px;
    stroke-width: 2.2px;
    background: transparent;
    padding: 0;
    pointer-events: none;
  }''',
'''  .more-menu-icon svg {
    color: #0F766E;
    width: 22px;
    height: 22px;
    stroke-width: 2.2px;
    background: transparent;
    padding: 0;
    pointer-events: none;
  }'''
)

content = content.replace(
'''  .more-menu-item:active .more-menu-icon {
    transform: scale(1.1);
    background: #FFEDD5;
  }''',
'''  .more-menu-item:active .more-menu-icon {
    transform: scale(1.1);
    background: #CCFBF1;
  }'''
)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
