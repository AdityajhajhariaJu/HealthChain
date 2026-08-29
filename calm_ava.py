import re

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Theme Object
content = content.replace(
'''  const theme = {
    primary: '#EA580C', // Violet 500
    light: '#FFF7ED', // Violet 50
    text: '#9A3412', // Violet 900
    bg: '#FAFAFA', // Keep it neutral/clean slate
  };''',
'''  const theme = {
    primary: '#0D9488', // Teal 600 - Calm & Peaceful
    light: '#F0FDFA', // Teal 50
    text: '#115E59', // Teal 800
    bg: '#F8FAFC', // Slate 50
  };'''
)

# Background
content = content.replace("background: '#FFF9F0',", "background: '#F8FAFC',")

# Ava Pro Plus Badge
content = content.replace(
'''<span style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', color: 'white',''',
'''<span style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)', color: 'white','''
)

# Imported Case styling
content = content.replace(
'''background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
                  border: '1.5px solid #DDD6FE',
                  borderRadius: 20,
                  padding: isMobile ? '14px 16px' : '16px 20px',
                  marginBottom: 8,
                  boxShadow: '0 4px 16px rgba(234,88,12,0.08)',''',
'''background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
                  border: '1.5px solid #99F6E4',
                  borderRadius: 20,
                  padding: isMobile ? '14px 16px' : '16px 20px',
                  marginBottom: 8,
                  boxShadow: '0 4px 16px rgba(13,148,136,0.08)','''
)
content = content.replace(
"background: '#EA580C'", "background: '#0D9488'"
)
content = content.replace(
"color: '#EA580C'", "color: '#0D9488'"
)
content = content.replace(
"color: '#C2410C'", "color: '#0F766E'"
)
content = content.replace(
"color: '#9A3412'", "color: '#115E59'"
)
content = content.replace(
"background: 'rgba(234,88,12,0.15)'", "background: 'rgba(13,148,136,0.15)'"
)
content = content.replace(
"border: '1px solid #C4B5FD',", "border: '1px solid #99F6E4',"
)
content = content.replace(
"border: 1px solid ", "border: 1px solid "
)
content = content.replace(
"importedCase ? '#EDE9FE' : theme.light", "importedCase ? '#CCFBF1' : theme.light"
)
content = content.replace(
"importedCase ? '#FED7AA' : theme.light", "importedCase ? '#99F6E4' : theme.light"
)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
