import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
'''  .mobile-tab-bar.scrolling {
    transform: translateY(12px) scale(0.85);
    border-radius: 40px;
    opacity: 0;
    pointer-events: none;
    box-shadow: 0 0 0 rgba(15, 23, 42, 0);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }''',
'''  .mobile-tab-bar.scrolling {
    transform: translateY(12px) scale(0.85);
    border-radius: 40px;
    opacity: 0;
    pointer-events: none;
    box-shadow: 0 0 0 rgba(15, 23, 42, 0);
  }'''
)

# Add will-change and translateZ to stabilize iOS rendering
content = content.replace(
'''    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                border-radius 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow 0.3s ease;
    transform-origin: bottom center;
  }''',
'''    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                border-radius 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow 0.3s ease;
    transform-origin: bottom center;
    will-change: transform, opacity, border-radius;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
  }'''
)


with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
