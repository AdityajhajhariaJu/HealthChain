import re

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/CaseDashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix buttons in Articles
content = content.replace("padding: 0 }}", "padding: 0, minWidth: '32px', minHeight: '32px', flexShrink: 0 }}")

# Fix Flame badge icon wrapper in Articles
content = content.replace("justifyContent: 'center' }}", "justifyContent: 'center', flexShrink: 0 }}")

# Fix Play button in MeditationHeroCard
content = content.replace("backdropFilter: 'blur(4px)' }}", "backdropFilter: 'blur(4px)', minWidth: '40px', minHeight: '40px', flexShrink: 0 }}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Applied flexShrink and minWidth to icons')
