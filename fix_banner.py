import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\GuestStickyBanner.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

find_style = """          margin: '0 auto 12px auto',
          alignSelf: 'center',
          width: '100%',
          maxWidth: '1120px',
          color: '#ffffff',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12.5px',
          zIndex: 40,
          position: 'sticky',
          top: 'calc(56px + var(--safe-area-top, 0px))',"""

replace_style = """          margin: '0',
          width: 'calc(100% - 24px)',
          maxWidth: '500px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#ffffff',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          zIndex: 100,
          position: 'fixed',
          bottom: 'calc(100px + env(safe-area-inset-bottom))',"""

content = content.replace(find_style, replace_style)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated GuestStickyBanner positioning")
