with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

parts = content.split('ref={chatContainerRef}')
if len(parts) == 2:
    content = parts[0] + "ref={chatContainerRef}\n            onScroll={(e) => window.dispatchEvent(new CustomEvent('hc_scroll_intent', { detail: { scrollTop: e.currentTarget.scrollTop } }))}" + parts[1]

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done Ava!')
