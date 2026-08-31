import sys
import re

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("onFocus={() => { setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 300); }}", "")
content = content.replace("onFocus={(e) => { e.target.style.borderColor = theme.primary; e.target.style.boxShadow = '0 8px 32px rgba(244, 63, 94, 0.25)'; }}", "onFocus={(e) => { setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 300); e.target.style.borderColor = theme.primary; e.target.style.boxShadow = '0 8px 32px rgba(244, 63, 94, 0.25)'; }}")

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
