import re

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "boxShadow: '0 2px 8px rgba(0,0,0,0.03)',",
    "boxShadow: msg.role === 'user' ? '0 4px 12px rgba(234,88,12,0.15)' : '0 4px 12px rgba(0,0,0,0.03)',"
)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
