import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
'''  .mobile-tab svg {
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
  }''',
'''  .mobile-tab svg {
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), stroke-width 0.2s;
    stroke-width: 2px;
    transform-origin: center;
    will-change: transform;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
  }
  
  .mobile-tab:active svg {
    transform: scale(0.85) translateZ(0);
  }
  
  .mobile-tab.active {
    color: #0F766E;
  }
  
  .mobile-tab.active svg {
    transform: scale(1.14) translateY(-1.5px) translateZ(0);
    stroke-width: 2.6px;
  }'''
)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
