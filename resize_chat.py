import re

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Bubbles
content = content.replace(
    "padding: isMobile ? '12px 16px' : '16px 20px',",
    "padding: isMobile ? '10px 14px' : '12px 18px',"
)
content = content.replace(
    "fontSize: '15px',\n                        lineHeight: 1.6,",
    "fontSize: isMobile ? '14.5px' : '15px',\n                        lineHeight: 1.45,"
)

# Input Box
content = content.replace(
    "padding: '18px 24px 18px 56px',",
    "padding: isMobile ? '12px 46px 12px 44px' : '16px 56px 16px 52px',"
)

# Attach button
content = content.replace(
    "left: '12px',\n                  width: '36px',\n                  height: '36px',",
    "left: isMobile ? '4px' : '12px',\n                  width: isMobile ? '36px' : '36px',\n                  height: isMobile ? '36px' : '36px',"
)

# Send button
content = content.replace(
    "right: '8px',\n                  width: '40px',\n                  height: '40px',",
    "right: isMobile ? '5px' : '8px',\n                  width: isMobile ? '34px' : '40px',\n                  height: isMobile ? '34px' : '40px',"
)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
