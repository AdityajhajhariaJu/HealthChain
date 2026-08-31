import sys

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("background: 'transparent',\n        position: 'relative',", "background: 'transparent',")
content = content.replace("className=\"ava-input\"\n                        onFocus={handleInputFocus}\n                        onFocus={handleInputFocus}", "className=\"ava-input\"\n                        onFocus={handleInputFocus}")

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
