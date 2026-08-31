import sys

with open('src/features/dietician/Dietician.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("emoji: '??'", "emoji: '??'")

with open('src/features/dietician/Dietician.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
