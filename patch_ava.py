import sys
import re

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix the typing auto-scroll loop
old_scroll = '''        if (messagesEndRef?.current) {
          const container = messagesEndRef.current.parentElement;
          if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollHeight - scrollTop - clientHeight < 150) {'''
new_scroll = '''        if (messagesEndRef?.current) {
          const container = messagesEndRef.current.parentElement?.parentElement;
          if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollHeight - scrollTop - clientHeight < 150) {'''
content = content.replace(old_scroll, new_scroll)

# 2. Add minHeight: 0 to the root div of AvaHealthBuddy
# It starts with:
#       <div
#         style={{
#           padding: isMobile ? '0' : '0 24px',
#           height: '100%',
#           flex: 1,

content = re.sub(
    r"(height: '100%',\s*flex: 1,)",
    r"\1 minHeight: 0,",
    content,
    count=1
)

# 3. Add minHeight: 0 to chatContainerRef
content = re.sub(
    r"(flex: 1,\s*overflowY: 'auto',)",
    r"flex: 1, minHeight: 0, overflowY: 'auto',",
    content,
    count=1
)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
