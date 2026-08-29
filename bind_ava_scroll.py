import re

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
'''        <div
          ref={chatContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '20px 8px' : '32px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >''',
'''        <div
          ref={chatContainerRef}
          onScroll={(e) => {
            window.dispatchEvent(new CustomEvent('hc_scroll_intent', { detail: { scrollTop: e.currentTarget.scrollTop } }));
          }}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '20px 8px' : '32px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >'''
)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done Ava!')
