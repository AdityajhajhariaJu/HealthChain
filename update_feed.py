import re

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/ImmersiveFeatureFeed.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Change the wrapper from horizontal scroll to vertical stack
old_wrapper = '''<div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', gap: '16px', width: '100vw', padding: '0 24px 24px 24px', marginLeft: '-24px', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>'''
new_wrapper = '''<div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>'''
content = content.replace(old_wrapper, new_wrapper)

# Change the card from fixed width to 100% width, and maybe taller
old_card_style = '''            style={{ 
              position: 'relative',
              width: '180px',
              minWidth: '180px',
              height: '240px',
              scrollSnapAlign: 'center','''
new_card_style = '''            style={{ 
              position: 'relative',
              width: '100%',
              height: '320px','''
content = content.replace(old_card_style, new_card_style)

# We should also change the border radius to match the big card in Image 1
content = content.replace("borderRadius: '28px'", "borderRadius: '24px'")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated ImmersiveFeatureFeed layout')
